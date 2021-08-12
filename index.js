#!/usr/bin/env node

const yargs = require("yargs");

const options = yargs
	.option("a", {
		alias: "accessKeyId",
		describe: "S3 accessKeyId",
		type: "string",
		demandOption: true,
	})
	.option("s", {
		alias: "secretAccessKey",
		describe: "S3 secretAccessKey",
		type: "string",
		demandOption: true,
	})
	.option("b", {
		alias: "bucket",
		describe: "S3 bucket",
		type: "string",
		demandOption: true,
	})
	.option("f", {
		alias: "folder",
		describe: "S3 folder",
		type: "string",
	}).argv;

const AWS = require("aws-sdk");
const cliProgress = require("cli-progress");
const fs = require("fs-extra");
const path = require("path");

// Create a new progress bar instance and use shades_classic theme
const cliBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_grey);

// Config S3
const S3 = {
	AUTH: {
		accessKeyId: options.accessKeyId,
		secretAccessKey: options.secretAccessKey,
	},
	BUCKET: options.bucket,
};
AWS.config.update(S3.AUTH);
const s3 = new AWS.S3();

/**
 * Download file by s3 key
 *
 * @param {string} filePath output file path
 * @param {string} s3Key s3 key
 */
function downloadFile(filePath, s3Key) {
	return new Promise((resolve, reject) => {
		const params = {
			Bucket: S3.BUCKET,
			Key: s3Key,
		};
		const readStream = s3.getObject(params).createReadStream();
		readStream
			.pipe(fs.createWriteStream(filePath))
			.on("error", (err) => reject(err))
			.on("finish", () => resolve());
	});
}

/**
 * Get all keys from a S3 folder
 *
 * @param {string} folder
 * @return {array} keys
 */
async function getListObjects(folder) {
	const params = {
		Bucket: S3.BUCKET,
		Delimiter: "/",
		Prefix: folder,
	};

	const allKeys = [];
	do {
		const data = await s3.listObjectsV2(params).promise();
		// Append file object list
		allKeys.push(...data.Contents);
		// Recursive folder
		for (const prefix of data.CommonPrefixes.map((item) => item.Prefix)) {
			allKeys.push(...(await getListObjects(prefix)));
		}
		// Travel to next page
		params.ContinuationToken = data.NextContinuationToken;
	} while (params.ContinuationToken);

	return allKeys;
}

(async function () {
	try {
		// Make dir
		const downloadPath = path.join(__dirname, options.folder || "");
		if (!fs.existsSync(downloadPath)) {
			fs.mkdirSync(downloadPath, { recursive: true });
		}

		const objects = await getListObjects(options.folder || "");

		// Start downloading
		cliBar.start(objects.length, 0);

		for (const { Key } of objects) {
			// When object type is folder
			if (Key.endsWith("/")) {
				const folderPath = path.join(__dirname, Key);
				// Make sure the path exists for the following files
				if (!fs.existsSync(folderPath)) {
					fs.mkdirSync(folderPath, { recursive: true });
				}
				cliBar.increment();
				continue;
			}

			const filePath = path.join(__dirname, Key);
			await downloadFile(filePath, Key);
			cliBar.increment();
		}

		cliBar.stop();
		console.log("🚀 Downloaded", objects.length, "file(s)");
	} catch (err) {
		console.error(err);
	}
})();

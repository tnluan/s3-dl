# s3-dl
Download all files in any folder from S3

## Installation
```
npm install -g s3-dl
```

## Usage
### Download whole bucket
```
s3-dl -a <s3-access-key-id> -s <s3-secret-access-key> -b <s3-bucket>
```
### Download specific folder
```
s3-dl -a <s3-access-key-id> -s <s3-secret-access-key> -b <s3-bucket> -f <s3-folder-path>
```

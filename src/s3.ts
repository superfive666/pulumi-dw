import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { CannedAcl, AccountPublicAccessBlockArgs } from '@pulumi/aws/s3';

interface IS3BucketOutput {
  log: aws.s3.Bucket;
  jupyter: aws.s3.Bucket;
  rdl: aws.s3.Bucket;
  sdl: aws.s3.Bucket;
  adl: aws.s3.Bucket;
}

const blockOpts: AccountPublicAccessBlockArgs = {
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true
};

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  Project: 'mpdw',
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureS3BucketPolicy = () => {};

export const configureS3Bucket = (env: string): IS3BucketOutput => {
  const log = createBucket(`app-mpdw-${env}-log`, 'emr');
  const rdl = createBucket(`app-mpdw-${env}-rdl`, 'emr-rdl');
  const sdl = createBucket(`app-mpdw-${env}-sdl`, 'emr-sdl');
  const adl = createBucket(`app-mpdw-${env}-adl`, 'emr-adl');
  const jupyter = createBucket(`app-mpdw-${env}-jpt`, 'emr-jpt');

  return {
    log,
    jupyter,
    rdl,
    sdl,
    adl
  };
};

const createBucket = (bucketName: string, purpose: string): aws.s3.Bucket => {
  const bucket = new aws.s3.Bucket(bucketName, {
    acl: CannedAcl.Private,
    tags: {
      ...baseTags,
      purpose
    }
  });

  new aws.s3.BucketPublicAccessBlock(
    bucketName,
    {
      ...blockOpts,
      bucket: bucket.id
    },
    { dependsOn: [bucket] }
  );

  return bucket;
};

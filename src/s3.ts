import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { CannedAcl, AccountPublicAccessBlockArgs } from '@pulumi/aws/s3';

interface IS3BucketOutput {
  log: aws.s3.Bucket;
  data: aws.s3.Bucket;
  jupyter: aws.s3.Bucket;
}

export const configureS3Bucket = (env: string): IS3BucketOutput => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const baseTags: aws.Tags = {
    Project: 'mpdw',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const blockOpts: AccountPublicAccessBlockArgs = {
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true
  };

  const logName = `app-mpdw-${env}-log`;
  const log = new aws.s3.Bucket(logName, {
    acl: CannedAcl.Private,
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });
  new aws.s3.BucketPublicAccessBlock(
    logName,
    {
      ...blockOpts,
      bucket: log.id
    },
    { dependsOn: [log] }
  );

  const dataName = `app-mpdw-${env}-data`;
  const data = new aws.s3.Bucket(dataName, {
    acl: CannedAcl.Private,
    tags: {
      ...baseTags,
      purpose: 'emr-data'
    }
  });
  new aws.s3.BucketPublicAccessBlock(
    dataName,
    {
      ...blockOpts,
      bucket: data.id
    },
    { dependsOn: [data] }
  );

  const jupyterName = `app-mpdw-${env}-jpt`;
  const jupyter = new aws.s3.Bucket(jupyterName, {
    acl: CannedAcl.Private,
    tags: {
      ...baseTags,
      purpose: 'emr-jpt'
    }
  });
  new aws.s3.BucketPublicAccessBlock(
    jupyterName,
    {
      ...blockOpts,
      bucket: jupyter.id
    },
    { dependsOn: [jupyter] }
  );

  return {
    log,
    data,
    jupyter
  };
};

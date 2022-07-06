import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

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

  const logName = `app-mpdw-${env}-log`;
  const log = new aws.s3.Bucket(logName, {
    acl: 'private',
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });

  const dataName = `app-mpdw-${env}-data`;
  const data = new aws.s3.Bucket(dataName, {
    acl: 'private',
    tags: {
      ...baseTags,
      purpose: 'emr-data'
    }
  });

  const jupyterName = `app-mpdw-${env}-jpt`;
  const jupyter = new aws.s3.Bucket(jupyterName, {
    acl: 'private',
    tags: {
      ...baseTags,
      purpose: 'emr-jpt'
    }
  });

  return {
    log,
    data,
    jupyter
  };
};

import * as pulumi from '@pulumi/pulumi';

import { Bucket } from '@pulumi/aws/s3';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureS3Bucket = (env: string): Bucket => {
  const bucketName = `data-s3-${env}`;
  const s3 = new Bucket(bucketName, {
    acl: 'private',
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });

  return s3;
};

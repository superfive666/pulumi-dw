import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

export const configureS3Bucket = (env: string): aws.s3.Bucket => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const baseTags: aws.Tags = {
    Project: 'mpdw',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const bucketName = `app-mpdw-s3-${env}`;
  const s3 = new aws.s3.Bucket(bucketName, {
    acl: 'private',
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });

  return s3;
};

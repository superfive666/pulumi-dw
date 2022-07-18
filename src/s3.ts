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

interface IS3BucketPolicyOutput {
  rdl: aws.s3.BucketPolicy;
  sdl: aws.s3.BucketPolicy;
  adl: aws.s3.BucketPolicy;
}

interface IS3BucketPolicyProps {
  env: string;
  rdl: aws.s3.Bucket;
  sdl: aws.s3.Bucket;
  adl: aws.s3.Bucket;
  emr: {
    emr: aws.iam.Role;
    jpt: aws.iam.Role;
  };
  ec2: {
    emr: aws.iam.Role;
    jpt: aws.iam.Role;
  };
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

export const configureS3BucketPolicy = ({
  env,
  rdl: rdlBucket,
  sdl: sdlBucket,
  adl: adlBucket,
  emr,
  ec2
}: IS3BucketPolicyProps): IS3BucketPolicyOutput => {
  const rdl = new aws.s3.BucketPolicy(`rdl-${env}`, {
    bucket: rdlBucket.id,
    policy: pulumi
      .output({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Deny',
            NotPrincipal: {
              AWS: [emr.emr.arn, emr.jpt.arn, ec2.emr.arn, ec2.jpt.arn]
            },
            Action: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: [
              pulumi.interpolate`arn:aws:s3:::${rdlBucket.id}`,
              pulumi.interpolate`arn:aws:s3:::${rdlBucket.id}/*`
            ]
          }
        ]
      })
      .apply((v) => JSON.stringify(v))
  });
  const sdl = new aws.s3.BucketPolicy(`rdl-${env}`, {
    bucket: sdlBucket.id,
    policy: pulumi
      .output({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Deny',
            NotPrincipal: {
              AWS: [emr.emr.arn, emr.jpt.arn, ec2.emr.arn, ec2.jpt.arn]
            },
            Action: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: [
              pulumi.interpolate`arn:aws:s3:::${sdlBucket.id}`,
              pulumi.interpolate`arn:aws:s3:::${sdlBucket.id}/*`
            ]
          }
        ]
      })
      .apply((v) => JSON.stringify(v))
  });
  const adl = new aws.s3.BucketPolicy(`rdl-${env}`, {
    bucket: adlBucket.id,
    policy: pulumi
      .output({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Deny',
            NotPrincipal: {
              AWS: [emr.emr.arn, emr.jpt.arn, ec2.emr.arn, ec2.jpt.arn]
            },
            Action: ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: [
              pulumi.interpolate`arn:aws:s3:::${adlBucket.id}`,
              pulumi.interpolate`arn:aws:s3:::${adlBucket.id}/*`
            ]
          }
        ]
      })
      .apply((v) => JSON.stringify(v))
  });

  return { rdl, sdl, adl };
};

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

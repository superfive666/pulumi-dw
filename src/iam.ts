import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws';
import { Role } from '@pulumi/aws/iam';

interface IIamRoleSettings {
  alb: Role;
  emr: Role;
  rds: Role;
  tableau: Role;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureIamRoles = (env: string): IIamRoleSettings => {
  const alb = createAlbRole();
  const emr = createEmrRole(env);
  const rds = createRdsRole();
  const tableau = createTableauRole();

  return { alb, emr, rds, tableau };
};

const createAlbRole = (): Role => {
  const roleName = 'ALB_DEFAULT_ROLE';
  const role = new Role(roleName, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: []
    }),
    tags: {
      ...baseTags,
      purpose: 'alb'
    }
  });

  return role;
};

const createEmrRole = (env: string): Role => {
  const s3Bucket = `data-s3-${env}`;
  const roleName = 'EMR_DEFAULT_ROLE';
  const role = new Role(roleName, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        // grant S3 bucket read / write access
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
          Resource: [`arn:aws:s3:::${s3Bucket}/*`]
        },
        // grant S3 bucket list object
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket'],
          Resource: [`arn:aws:s3:::${s3Bucket}`]
        }
      ]
    }),
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });

  return role;
};

const createRdsRole = (): Role => {
  const roleName = 'RDS_DEFAULT_ROLE';
  const role = new Role(roleName, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: []
    }),
    tags: {
      ...baseTags,
      purpose: 'rds'
    }
  });

  return role;
};

const createTableauRole = (): Role => {
  const roleName = 'TABLEAU_DEFAULT_ROLE';
  const role = new Role(roleName, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: []
    }),
    tags: {
      ...baseTags,
      purpose: 'tableau'
    }
  });

  return role;
};

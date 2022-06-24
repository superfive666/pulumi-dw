import * as pulumi from '@pulumi/pulumi';

import { Role } from '@pulumi/aws/iam';

interface IIamRoleSettings {
  alb: Role;
  emr: Role;
  rds: Role;
  tableau: Role;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureIamRoles = (): IIamRoleSettings => {
  const alb = createAlbRole();
  const emr = createEmrRole();
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

const createEmrRole = (): Role => {
  const roleName = 'EMR_DEFAULT_ROLE';
  const role = new Role(roleName, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        // grant S3 bucket read / write access
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

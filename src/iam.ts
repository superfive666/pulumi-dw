import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface IIamRoleSettings {
  alb: aws.iam.Role;
  emr: aws.iam.Role;
  rds: aws.iam.Role;
  tableau: aws.iam.Role;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  Project: 'mpdw',
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

const createAlbRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_ALB_ROLE';
  const role = new aws.iam.Role(roleName, {
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

const createEmrRole = (env: string): aws.iam.Role => {
  const s3Bucket = `app-mpdw-s3-${env}`;
  const roleName = 'APP_MPDW_EMR_ROLE';
  const role = new aws.iam.Role(roleName, {
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
        },
        // grant required IAM permissions as documented on: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html#emr-fleet-spot-options
        {
          Effect: 'Allow',
          Action: [
            'ec2:DeleteLaunchTemplate',
            'ec2:CreateLaunchTemplate',
            'ec2:DescribeLaunchTemplates',
            'ec2:CreateLaunchTemplateVersion',
            'ec2:CreateFleet',
            // to use targeted capacity reservations, you must include the following additional permissions
            'ec2:DescribeCapacityReservations',
            'ec2:DescribeLaunchTemplateVersions',
            'ec2:DeleteLaunchTemplateVersions',
            'resource-groups:ListGroupResources'
          ],
          Resource: '*'
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

const createRdsRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_RDS_ROLE';
  const role = new aws.iam.Role(roleName, {
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

const createTableauRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_TABLEAU_ROLE';
  const role = new aws.iam.Role(roleName, {
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

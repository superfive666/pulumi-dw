import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface IIamRoleSettings {
  emr: aws.iam.Role;
  tableau: aws.iam.Role;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  Project: 'mpdw',
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureIamRoles = (s3: aws.s3.Bucket): IIamRoleSettings => {
  const emr = createEmrRole(s3);
  const tableau = createTableauRole(s3);

  return { emr, tableau };
};

const instanceAssumePolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      actions: ['sts:AssumeRole'],
      principals: [
        {
          type: 'Service',
          identifiers: ['ec2.amazonaws.com']
        }
      ]
    }
  ]
});

const createEmrRole = (s3: aws.s3.Bucket): aws.iam.Role => {
  const roleName = 'APP_MPDW_EMR_ROLE';
  const role = new aws.iam.Role(
    roleName,
    {
      assumeRolePolicy: instanceAssumePolicy.then((policy) => policy.json),
      inlinePolicies: [
        {
          name: 'allow-s3-edit',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:PutObject', 's3:DeleteObject'],
                Resource: [s3.arn.apply((v) => v.toString())]
              }
            ]
          })
        },
        {
          name: 'allow-s3-read',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:ListBucket', 's3:GetObject'],
                Resource: [s3.arn.apply((v) => v.toString())]
              }
            ]
          })
        },
        // grant required IAM permissions as documented on: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html#emr-fleet-spot-options
        {
          name: 'allow-emr-ec2',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
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
          })
        }
      ],
      tags: {
        ...baseTags,
        purpose: 'emr'
      }
    },
    { dependsOn: [s3] }
  );

  return role;
};

const createTableauRole = (s3: aws.s3.Bucket): aws.iam.Role => {
  const roleName = 'APP_MPDW_TABLEAU_ROLE';
  const role = new aws.iam.Role(
    roleName,
    {
      assumeRolePolicy: instanceAssumePolicy.then((policy) => policy.json),
      inlinePolicies: [
        {
          name: 'allow-s3-edit',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:PutObject', 's3:DeleteObject'],
                Resource: [s3.arn.apply((v) => v.toString())]
              }
            ]
          })
        },
        {
          name: 'allow-s3-read',
          policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['s3:ListBucket', 's3:GetObject'],
                Resource: [s3.arn.apply((v) => v.toString())]
              }
            ]
          })
        }
      ],
      tags: {
        ...baseTags,
        purpose: 'tableau'
      }
    },
    { dependsOn: [s3] }
  );

  return role;
};

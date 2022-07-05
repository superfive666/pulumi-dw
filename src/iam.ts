import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { log } from '..';

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
  const emr = createEmrRole();
  const tableau = createTableauRole();

  s3.arn.apply((arn: string) => {
    const emrPolicy = createEmrPolicy(arn);
    const tableauPolicy = createTableauPolicy(arn);

    const attchEmr = new aws.iam.RolePolicyAttachment(
      'app-mpdw-emr-role-attachment',
      {
        role: emr.name,
        policyArn: emrPolicy.arn
      },
      { dependsOn: [s3] }
    );

    attchEmr.id.apply((v) => log('info', `Role access policies attached APP_MPDW_EMR_ROLE: ${v}`));

    const attachTableau = new aws.iam.RolePolicyAttachment(
      'app-mpdw-tableau-role-attachment',
      {
        role: tableau.name,
        policyArn: tableauPolicy.arn
      },
      { dependsOn: [s3] }
    );

    attachTableau.id.apply((v) =>
      log('info', `Role access policies attached APP_MPDW_TABLEAU_ROLE: ${v}`)
    );
  });

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

const instanceEmrAssumePolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      principals: [
        {
          type: 'Service',
          identifiers: ['elasticmapreduce.amazonaws.com']
        }
      ],
      actions: ['sts:AssumeRole']
    }
  ]
});

const createTableauPolicy = (arn: string): aws.iam.Policy => {
  const timestamp = new Date().toISOString();
  const policy = new aws.iam.Policy('app-mpdw-tableau-policy', {
    description: `App MPDW policy for Tableau EC2 instance that allows S3 to specific resources ${timestamp}`,
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:DeleteObject'],
          Resource: [`${arn}/*`]
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket', 's3:GetObject'],
          Resource: [`${arn}/*`]
        }
      ]
    })
  });

  return policy;
};

const createEmrPolicy = (arn: string): aws.iam.Policy => {
  const timestamp = new Date().toISOString();
  const policy = new aws.iam.Policy('app-mpdw-emr-policy', {
    description: `App MPDW policy for EMR cluster that allows EC2 and S3 to specific resources ${timestamp}`,
    policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:DeleteObject'],
          Resource: [`${arn}/*`]
        },
        {
          Effect: 'Allow',
          Action: ['s3:ListBucket', 's3:GetObject'],
          Resource: [`${arn}/*`]
        },
        // grant required IAM permissions as documented on: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html#emr-fleet-spot-options
        {
          Effect: 'Allow',
          Action: [
            // to use targeted capacity reservations, you must include the following additional permissions
            'ec2:*',
            'resource-groups:ListGroupResources'
          ],
          Resource: '*'
        }
      ]
    })
  });

  return policy;
};

const createEmrRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_EMR_ROLE';
  const role = new aws.iam.Role(roleName, {
    assumeRolePolicy: instanceEmrAssumePolicy.then((policy) => policy.json),
    tags: {
      ...baseTags,
      purpose: 'emr'
    }
  });

  return role;
};

const createTableauRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_TABLEAU_ROLE';
  const role = new aws.iam.Role(roleName, {
    assumeRolePolicy: instanceAssumePolicy.then((policy) => policy.json),
    tags: {
      ...baseTags,
      purpose: 'tableau'
    }
  });

  return role;
};

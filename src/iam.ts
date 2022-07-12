import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface IIamRoleSettings {
  emr: aws.iam.Role;
  ec2: aws.iam.Role;
  scaling: aws.iam.Role;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  Project: 'mpdw',
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureIamRoles = (): IIamRoleSettings => {
  const emr = createEmrRole();
  const ec2 = createEc2Role();
  const scaling = createScalingRole();

  return { emr, ec2, scaling };
};

const createEmrRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_EMR_ROLE';
  const purpose = 'emr';
  const identifiers = ['elasticmapreduce.amazonaws.com'];

  return createRole(roleName, purpose, identifiers);
};

const createEc2Role = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_EC2_ROLE';
  const purpose = 'tableau';
  const identifiers = ['ec2.amazonaws.com'];

  return createRole(roleName, purpose, identifiers);
};

const createScalingRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_SCALING_ROLE';
  const purpose = 'scaling';
  const identifiers = ['application-autoscaling.amazonaws.com', 'elasticmapreduce.amazonaws.com'];

  return createRole(roleName, purpose, identifiers);
};

const createRole = (roleName: string, purpose: string, identifiers: string[]): aws.iam.Role => {
  const role = new aws.iam.Role(roleName, {
    assumeRolePolicy: getPolicyDocument(identifiers).then((policy) => policy.json),
    tags: {
      ...baseTags,
      purpose,
      Name: roleName
    }
  });

  return role;
};

const getPolicyDocument = (identifiers: string[]): Promise<aws.iam.GetPolicyDocumentResult> => {
  return aws.iam.getPolicyDocument({
    statements: [
      {
        actions: ['sts:AssumeRole'],
        principals: [
          {
            type: 'Service',
            identifiers
          }
        ]
      }
    ]
  });
};

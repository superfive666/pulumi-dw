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

  const role = createRole(roleName, purpose, identifiers);

  // Attach the following policies to the default EMR role: (all roles are managed by AWS)
  // 1. AmazonElasticMapReduceRole
  // 2. AmazonElasticMapReducePlacementGroupPolicy
  createAttachment(
    'app_mpdw_emr1',
    role,
    'arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole'
  );
  createAttachment(
    'app_mpdw_emr2',
    role,
    'arn:aws:iam::aws:policy/AmazonElasticMapReducePlacementGroupPolicy'
  );

  return role;
};

const createEc2Role = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_EC2_ROLE';
  const purpose = 'tableau';
  const identifiers = ['ec2.amazonaws.com'];

  const role = createRole(roleName, purpose, identifiers);

  // Attach the following policies to the default EC2 role: (all roles are managed by AWS)
  // 1. AmazonEC2RoleforSSM (this is for ssh into the instance using the AWS cloud shell, it is optional)
  // Note that the above policy will be deprecated soon:
  // Please use AmazonSSMManagedInstanceCore policy to enable AWS Systems Manager service core functionality on EC2 instances. For more information see https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-profile.html
  // 2. AmazonElasticMapReduceforEC2Role
  // 3. AmazonSSMManagedInstanceCore
  createAttachment(
    'app_mpdw_ec21',
    role,
    'arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM'
  );
  createAttachment(
    'app_mpdw_ec22',
    role,
    'arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforEC2Role'
  );
  createAttachment('app_mpdw_ec23', role, 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore');

  return role;
};

const createScalingRole = (): aws.iam.Role => {
  const roleName = 'APP_MPDW_SCALING_ROLE';
  const purpose = 'scaling';
  const identifiers = ['application-autoscaling.amazonaws.com', 'elasticmapreduce.amazonaws.com'];

  const role = createRole(roleName, purpose, identifiers);

  // Attach the following policies to the default Scaling role: (all roles are managed by AWS)
  // 1. AmazonElasticMapReduceforAutoScalingRole
  createAttachment(
    'app_mpdw_scaling',
    role,
    'arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforAutoScalingRole'
  );

  return role;
};

const createAttachment = (
  attachmentName: string,
  role: aws.iam.Role,
  policyArn: string
): aws.iam.RolePolicyAttachment => {
  return new aws.iam.RolePolicyAttachment(
    attachmentName,
    {
      role: role.name,
      policyArn
    },
    {
      dependsOn: [role]
    }
  );
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

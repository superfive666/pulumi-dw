import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

interface IIamRoleSettings {
  emrEmr: aws.iam.Role;
  emrJpt: aws.iam.Role;
  ec2Emr: aws.iam.Role;
  ec2Jpt: aws.iam.Role;
  ec2Tbl: aws.iam.Role;
  scaling: aws.iam.Role;
}

interface IIamRoleProps {
  env: string;
  rdl: aws.s3.Bucket;
  sdl: aws.s3.Bucket;
  adl: aws.s3.Bucket;
}

interface IS3IamPolicyProps {
  name: string;
  description: string;
  s3: aws.s3.Bucket;
  readonly?: boolean;
}

interface IIamPolicyAttachmentProps {
  name: string;
  policy: pulumi.Input<string>;
}

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  Project: 'mpdw',
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack
};

export const configureIamRoles = ({ env, rdl, sdl, adl }: IIamRoleProps): IIamRoleSettings => {
  const modifiedEmrPolicy = createPolicy(
    `AmazonEmrRole${env.toUpperCase()}`,
    'This is the role created by modifying based on the AWS management role arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceRole, the changes include removing the unnecessary s3 access which need to be controlled',
    JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Resource: '*',
          Action: [
            'ec2:AuthorizeSecurityGroupEgress',
            'ec2:AuthorizeSecurityGroupIngress',
            'ec2:CancelSpotInstanceRequests',
            'ec2:CreateFleet',
            'ec2:CreateLaunchTemplate',
            'ec2:CreateNetworkInterface',
            'ec2:CreateSecurityGroup',
            'ec2:CreateTags',
            'ec2:DeleteLaunchTemplate',
            'ec2:DeleteNetworkInterface',
            'ec2:DeleteSecurityGroup',
            'ec2:DeleteTags',
            'ec2:DescribeAvailabilityZones',
            'ec2:DescribeAccountAttributes',
            'ec2:DescribeDhcpOptions',
            'ec2:DescribeImages',
            'ec2:DescribeInstanceStatus',
            'ec2:DescribeInstances',
            'ec2:DescribeKeyPairs',
            'ec2:DescribeLaunchTemplates',
            'ec2:DescribeNetworkAcls',
            'ec2:DescribeNetworkInterfaces',
            'ec2:DescribePrefixLists',
            'ec2:DescribeRouteTables',
            'ec2:DescribeSecurityGroups',
            'ec2:DescribeSpotInstanceRequests',
            'ec2:DescribeSpotPriceHistory',
            'ec2:DescribeSubnets',
            'ec2:DescribeTags',
            'ec2:DescribeVpcAttribute',
            'ec2:DescribeVpcEndpoints',
            'ec2:DescribeVpcEndpointServices',
            'ec2:DescribeVpcs',
            'ec2:DetachNetworkInterface',
            'ec2:ModifyImageAttribute',
            'ec2:ModifyInstanceAttribute',
            'ec2:RequestSpotInstances',
            'ec2:RevokeSecurityGroupEgress',
            'ec2:RunInstances',
            'ec2:TerminateInstances',
            'ec2:DeleteVolume',
            'ec2:DescribeVolumeStatus',
            'ec2:DescribeVolumes',
            'ec2:DetachVolume',
            'iam:GetRole',
            'iam:GetRolePolicy',
            'iam:ListInstanceProfiles',
            'iam:ListRolePolicies',
            'iam:PassRole',
            's3:CreateBucket',
            // Remove the s3 access rights from the default policy statement from aws managed
            // 's3:Get*',
            // 's3:List*',
            'sdb:BatchPutAttributes',
            'sdb:Select',
            'sqs:CreateQueue',
            'sqs:Delete*',
            'sqs:GetQueue*',
            'sqs:PurgeQueue',
            'sqs:ReceiveMessage',
            'cloudwatch:PutMetricAlarm',
            'cloudwatch:DescribeAlarms',
            'cloudwatch:DeleteAlarms',
            'application-autoscaling:RegisterScalableTarget',
            'application-autoscaling:DeregisterScalableTarget',
            'application-autoscaling:PutScalingPolicy',
            'application-autoscaling:DeleteScalingPolicy',
            'application-autoscaling:Describe*'
          ]
        },
        {
          Effect: 'Allow',
          Action: 'iam:CreateServiceLinkedRole',
          Resource:
            'arn:aws:iam::*:role/aws-service-role/spot.amazonaws.com/AWSServiceRoleForEC2Spot*',
          Condition: {
            StringLike: {
              'iam:AWSServiceName': 'spot.amazonaws.com'
            }
          }
        }
      ]
    })
  );
  const modifiedEmrEc2Policy = createPolicy(
    `AmazonEmrEc2Role${env.toUpperCase()}`,
    'This is the role created by modifying based on the AWS management role arn:aws:iam::aws:policy/service-role/AmazonElasticMapReduceforEC2Role, the changes include removing the unnecessary s3 access which need to be controlled',
    JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Resource: '*',
          Action: [
            'cloudwatch:*',
            'dynamodb:*',
            'ec2:Describe*',
            'elasticmapreduce:Describe*',
            'elasticmapreduce:ListBootstrapActions',
            'elasticmapreduce:ListClusters',
            'elasticmapreduce:ListInstanceGroups',
            'elasticmapreduce:ListInstances',
            'elasticmapreduce:ListSteps',
            'kinesis:CreateStream',
            'kinesis:DeleteStream',
            'kinesis:DescribeStream',
            'kinesis:GetRecords',
            'kinesis:GetShardIterator',
            'kinesis:MergeShards',
            'kinesis:PutRecord',
            'kinesis:SplitShard',
            'rds:Describe*',
            // Removing unnecessary s3 access rights
            // 's3:*',
            'sdb:*',
            'sns:*',
            'sqs:*',
            'glue:CreateDatabase',
            'glue:UpdateDatabase',
            'glue:DeleteDatabase',
            'glue:GetDatabase',
            'glue:GetDatabases',
            'glue:CreateTable',
            'glue:UpdateTable',
            'glue:DeleteTable',
            'glue:GetTable',
            'glue:GetTables',
            'glue:GetTableVersions',
            'glue:CreatePartition',
            'glue:BatchCreatePartition',
            'glue:UpdatePartition',
            'glue:DeletePartition',
            'glue:BatchDeletePartition',
            'glue:GetPartition',
            'glue:GetPartitions',
            'glue:BatchGetPartition',
            'glue:CreateUserDefinedFunction',
            'glue:UpdateUserDefinedFunction',
            'glue:DeleteUserDefinedFunction',
            'glue:GetUserDefinedFunction',
            'glue:GetUserDefinedFunctions'
          ]
        }
      ]
    })
  );
  const rdlRead = createS3BucketPolicy({
    name: `EmrRdlReadOnly${env.toUpperCase}`,
    description: 'Allow read access to RDL S3 bucket',
    s3: rdl,
    readonly: true
  });
  const rdlWrite = createS3BucketPolicy({
    name: `EmrRdlWrite${env.toUpperCase}`,
    description: 'Allow write access to RDL S3 bucket',
    s3: rdl
  });
  const sdlRead = createS3BucketPolicy({
    name: `EmrSdlReadOnly${env.toUpperCase}`,
    description: 'Allow read access to SDL S3 bucket',
    s3: sdl,
    readonly: true
  });
  const sdlWrite = createS3BucketPolicy({
    name: `EmrSdlWrite${env.toUpperCase}`,
    description: 'Allow write access to SDL S3 bucket',
    s3: sdl
  });
  const adlRead = createS3BucketPolicy({
    name: `EmrAdlReadOnly${env.toUpperCase}`,
    description: 'Allow read access to ADL S3 bucket',
    s3: adl,
    readonly: true
  });
  const adlWrite = createS3BucketPolicy({
    name: `EmrAdlWrite${env.toUpperCase}`,
    description: 'Allow write access to ADL S3 bucket',
    s3: adl
  });

  const emrEmr = createEmrRole(`EMR_${env}`, [
    { name: 'emr_emr1', policy: modifiedEmrPolicy.arn },
    {
      name: 'emr_emr2',
      policy: 'arn:aws:iam::aws:policy/AmazonElasticMapReducePlacementGroupPolicy'
    },
    { name: 'emr_emr3', policy: rdlRead.arn },
    { name: 'emr_emr4', policy: sdlRead.arn },
    { name: 'emr_emr5', policy: adlRead.arn }
  ]);
  const emrJpt = createEmrRole(`JPT_${env}`, [
    { name: 'emr_jpt1', policy: modifiedEmrPolicy.arn },
    {
      name: 'emr_jpt2',
      policy: 'arn:aws:iam::aws:policy/AmazonElasticMapReducePlacementGroupPolicy'
    },
    { name: 'emr_jpt3', policy: rdlRead.arn },
    { name: 'emr_jpt4', policy: sdlRead.arn },
    { name: 'emr_jpt5', policy: adlRead.arn }
  ]);
  const ec2Emr = createEc2Role(`EMR_${env}`, [
    { name: 'ec2_emr1', policy: modifiedEmrEc2Policy.arn },
    { name: 'ec2_emr2', policy: 'arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM' },
    { name: 'ec2_emr3', policy: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' },
    { name: 'ec2_emr4', policy: rdlRead.arn },
    { name: 'ec2_emr5', policy: sdlRead.arn },
    { name: 'ec2_emr6', policy: adlRead.arn },
    { name: 'ec2_emr7', policy: rdlWrite.arn },
    { name: 'ec2_emr8', policy: sdlWrite.arn },
    { name: 'ec2_emr9', policy: adlWrite.arn }
  ]);
  const ec2Jpt = createEc2Role(`JPT_${env}`, [
    { name: 'ec2_jpt1', policy: modifiedEmrEc2Policy.arn },
    { name: 'ec2_jpt2', policy: 'arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM' },
    { name: 'ec2_jpt3', policy: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' },
    { name: 'ec2_jpt4', policy: rdlRead.arn },
    { name: 'ec2_jpt5', policy: sdlRead.arn },
    { name: 'ec2_jpt6', policy: adlRead.arn }
  ]);
  const ec2Tbl = createEc2Role(`TBL_${env}`, [
    { name: 'ec2_tbl1', policy: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore' },
    { name: 'ec2_tbl2', policy: 'arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforSSM' }
  ]);
  const scaling = createScalingRole(env);

  return { emrEmr, emrJpt, ec2Emr, ec2Jpt, ec2Tbl, scaling };
};

const createEmrRole = (env: string, policies: IIamPolicyAttachmentProps[]): aws.iam.Role => {
  const roleName = `APP_MPDW_EMR_ROLE_${env.toUpperCase()}`;
  const purpose = 'emr';
  const identifiers = ['elasticmapreduce.amazonaws.com'];

  const role = createRole(roleName, purpose, identifiers);

  // Attach the following policies to the default EMR role: (all roles are managed by AWS)
  // 1. AmazonElasticMapReduceRole: this role is currently customized from default role removing unnecessary s3 bucket access rights
  // 2. AmazonElasticMapReducePlacementGroupPolicy
  policies.forEach(({ name, policy }) => createAttachment(name, role, policy));

  return role;
};

const createEc2Role = (env: string, policies: IIamPolicyAttachmentProps[]): aws.iam.Role => {
  const roleName = `APP_MPDW_EC2_ROLE_${env.toUpperCase()}`;
  const purpose = 'tableau';
  const identifiers = ['ec2.amazonaws.com'];

  const role = createRole(roleName, purpose, identifiers);

  // Attach the following policies to the default EC2 role: (all roles are managed by AWS)
  // 1. AmazonEC2RoleforSSM (this is for ssh into the instance using the AWS cloud shell, it is optional)
  // Note that the above policy will be deprecated soon:
  // Please use AmazonSSMManagedInstanceCore policy to enable AWS Systems Manager service core functionality on EC2 instances. For more information see https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-profile.html
  // 2. AmazonElasticMapReduceforEC2Role: this role is currently customized from default role removing unnecessary s3 bucket access rights
  // 3. AmazonSSMManagedInstanceCore
  policies.forEach(({ name, policy }) => createAttachment(name, role, policy));

  return role;
};

const createScalingRole = (env: string): aws.iam.Role => {
  const roleName = `APP_MPDW_SCALING_ROLE_${env.toUpperCase()}`;
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
  policyArn: pulumi.Input<string>
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

const createS3BucketPolicy = ({
  name,
  description,
  s3,
  readonly
}: IS3IamPolicyProps): aws.iam.Policy => {
  const actions = readonly ? ['s3:Get*,', 's3:List*'] : ['s3:Put*', 's3:Delete*'];

  return createPolicy(
    name,
    description,
    pulumi
      .output({
        Version: '2012-10-17',
        Statement: [
          {
            Action: actions,
            Effect: 'Allow',
            Resource: pulumi.interpolate`arn:aws:s3:::${s3.id}/*`
          }
        ]
      })
      .apply((v) => JSON.stringify(v))
  );
};

const createPolicy = (
  name: string,
  description: string,
  policy: pulumi.Input<string>
): aws.iam.Policy => {
  return new aws.iam.Policy(name, {
    path: '/',
    description,
    policy
  });
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

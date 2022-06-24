import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws/tags';
import { ec2 } from '@pulumi/aws/types/input';
import { SecurityGroup } from '@pulumi/aws/ec2';
import { Vpc, VpcSubnetArgs } from '@pulumi/awsx/ec2';

interface IVpcDetails {
  vpc: Vpc;
  securityGroups: SecurityGroup[];
}

interface IVpcConfig {
  numberOfAvailabilityZones: number;
  numberOfNatGateways: number;
}

const ALLOW_ALL_HTTP: pulumi.Input<ec2.SecurityGroupIngress> = {
  description: 'Allow all http traffic from anywhere',
  fromPort: 80,
  toPort: 80,
  protocol: 'tcp',
  cidrBlocks: ['0.0.0.0/0']
};

const ALLOW_ALL_HTTPS: pulumi.Input<ec2.SecurityGroupIngress> = {
  description: 'Allow all http traffic from anywhere',
  fromPort: 443,
  toPort: 443,
  protocol: 'tcp',
  cidrBlocks: ['0.0.0.0/0']
};

/**
 * Standard Security Egress Rule
 * this rule allow all internal resources to be able to access the internet;
 * modify this rule if it is required to be controlled otherwise
 */
const egress: pulumi.Input<ec2.SecurityGroupEgress>[] = [
  {
    description: 'Allow all outgoing traffic',
    fromPort: 0,
    toPort: 65535,
    protocol: 'all',
    cidrBlocks: ['0.0.0.0/0']
  }
];

export const configureVpc = (env: string): IVpcDetails => {
  const vpc = createVpc(env);
  const securityGroups = createSecurityGroups(env);

  return { vpc, securityGroups };
};

const createVpc = (env: string): Vpc => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();

  const config = new pulumi.Config();
  const vpcName = `data-platform-vpc-${env}`;
  const cidrBlock = '10.1.0.0/16';
  const { numberOfAvailabilityZones = 1, numberOfNatGateways = 1 } = config.requireObject<IVpcConfig>('vpc');

  const tags: Tags = {
    Name: vpcName,
    availability_zones_used: numberOfAvailabilityZones.toString(),
    nat_gateways: numberOfNatGateways.toString(),
    cidr_block: cidrBlock,
    crosswalk: 'yes',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const subnets: VpcSubnetArgs[] = [
    {
      type: 'public',
      name: `data-${env}-subnet-public`,
      cidrMask: 24,
    },
    {
      type: 'private',
      name: `data-${env}-subnet-private`,
      cidrMask: 24,
    }
  ];

  const vpc = new Vpc(vpcName, {
    numberOfAvailabilityZones,
    cidrBlock,
    numberOfNatGateways,
    subnets,
    tags
  });

  return vpc;
};

const createSecurityGroups = (env: string): SecurityGroup[] => {
  const baseName = 'data-platform-sg';
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const baseTags = {
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const alb = new SecurityGroup(`${baseName}-${env}-alb`, {
    description: 'Security group for ALB resource',
    // allow 80 and 443
    ingress: [ALLOW_ALL_HTTP, ALLOW_ALL_HTTPS],
    tags: {
      ...baseTags,
      purpose: 'alb'
    },
    egress
  });
  const alb2 = new SecurityGroup(`${baseName}-${env}-alb2`, {
    description: 'Security group for internal ALB resource',
    // allow all relevant ports
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'alb-internal'
    },
    egress
  });
  const emr = new SecurityGroup(`${baseName}-${env}-emr`, {
    description: 'Security group for EMR resource',
    // allow access from tableau and internal ALB
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'emr'
    },
    egress
  });
  const rds = new SecurityGroup(`${baseName}-${env}-rds`, {
    description: 'Security group for RDS resource',
    // only allow access from EMR (for storing metadata)
    ingress: [
      {
        description: 'EMR access right',
        protocol: 'tcp',
        fromPort: 5432,
        toPort: 5432,
        securityGroups: [`${baseName}-${env}-emr`]
      }
    ],
    tags: {
      ...baseTags,
      purpose: 'rds'
    },
    egress
  });
  const tableau = new SecurityGroup(`${baseName}-${env}-tableau`, {
    description: 'Security group for EC2 instance that will be installed with Tableau app',
    // allow access from general ALB instance
    ingress: [],
    tags: {
      ...baseTags,
      purpose: 'tableau'
    },
    egress
  });

  return [alb, alb2, emr, rds, tableau];
};

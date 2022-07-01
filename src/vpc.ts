import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';

import { input } from '@pulumi/aws/types';

import { log } from '../index';

interface IVpcSecurityGroupSettings {
  alb: aws.ec2.SecurityGroup;
  alb2: aws.ec2.SecurityGroup;
  emr: aws.ec2.SecurityGroup;
  emrSlave: aws.ec2.SecurityGroup;
  emrMaster: aws.ec2.SecurityGroup;
  rds: aws.ec2.SecurityGroup;
  tableau: aws.ec2.SecurityGroup;
}

interface IVpcDetails {
  vpc: awsx.ec2.Vpc;
  securityGroups: IVpcSecurityGroupSettings;
}

interface IVpcConfig {
  numberOfAvailabilityZones: number;
  numberOfNatGateways: number;
}

const baseIngressRule = (
  port: number,
  description: string
): pulumi.Input<input.ec2.SecurityGroupIngress> => {
  return {
    description,
    fromPort: port,
    toPort: port,
    protocol: 'tcp'
  };
};

const ALLOW_ALL_HTTP: pulumi.Input<input.ec2.SecurityGroupIngress> = {
  ...baseIngressRule(80, 'Allow all http traffic from anywhere'),
  cidrBlocks: ['0.0.0.0/0']
};

const ALLOW_ALL_HTTPS: pulumi.Input<aws.types.input.ec2.SecurityGroupIngress> = {
  ...baseIngressRule(443, 'Allow all https traffic from anywhere'),
  cidrBlocks: ['0.0.0.0/0']
};

// SSH to instance should be via jump server for environments higher than dev
const ALLOW_OFFICE_SSH: pulumi.Input<aws.types.input.ec2.SecurityGroupIngress> = {
  ...baseIngressRule(22, 'Allow SSH traffic from office IP'),
  cidrBlocks: ['165.225.112.137/32']
};

/**
 * Standard Security Egress Rule
 * this rule allow all internal resources to be able to access the internet;
 * modify this rule if it is required to be controlled otherwise
 */
const egress: pulumi.Input<aws.types.input.ec2.SecurityGroupEgress>[] = [
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
  const securityGroups = createSecurityGroups(env, vpc);

  return { vpc, securityGroups };
};

const createVpc = (env: string): awsx.ec2.Vpc => {
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const config = new pulumi.Config();

  const vpcName = `app-mpdw-vpc-${env}`;
  const cidrBlock = '10.54.96.0/19';
  log('info', `Creating project VPC named: ${vpcName} and CIDR block: ${cidrBlock}`);

  const { numberOfAvailabilityZones, numberOfNatGateways } =
    config.requireObject<IVpcConfig>('vpc');
  log('info', `{VPC} - number of availability zones: ${numberOfAvailabilityZones}`);
  log('info', `{VPC} - number of NAT gateways: ${numberOfNatGateways}`);

  const timestamp = new Date().toISOString();

  const baseTags: aws.Tags = {
    Project: 'mpdw',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack,
    timestamp
  };

  const tags: aws.Tags = {
    ...baseTags,
    Name: vpcName,
    availability_zones_used: numberOfAvailabilityZones.toString(),
    nat_gateways: numberOfNatGateways.toString(),
    cidr_block: cidrBlock,
    crosswalk: 'yes'
  };

  const subnets: awsx.ec2.VpcSubnetArgs[] = [
    {
      type: 'public',
      name: 'subnet',
      cidrMask: 24,
      tags: baseTags
    },
    {
      type: 'private',
      name: 'subnet',
      cidrMask: 24,
      tags: baseTags
    }
  ];

  const vpc = new awsx.ec2.Vpc(vpcName, {
    numberOfAvailabilityZones,
    cidrBlock,
    numberOfNatGateways,
    subnets,
    tags
  });

  return vpc;
};

const createSecurityGroups = (env: string, vpc: awsx.ec2.Vpc): IVpcSecurityGroupSettings => {
  const baseName = 'app-mpdw-sg';
  const pulumiProject = pulumi.getProject();
  const stack = pulumi.getStack();
  const baseTags = {
    Project: 'mpdw',
    'pulumi:Project': pulumiProject,
    'pulumi:Stack': stack
  };

  const timestamp = new Date().toISOString();

  const alb = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-alb`,
    {
      name: `${baseName}-${env}-alb`,
      vpcId: vpc.id,
      description: `Security group for ALB resource ${timestamp}`,
      // allow 80 and 443
      ingress: [ALLOW_ALL_HTTP, ALLOW_ALL_HTTPS],
      tags: {
        ...baseTags,
        purpose: 'alb'
      },
      egress
    },
    { dependsOn: [vpc] }
  );

  const alb2 = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-alb2`,
    {
      name: `${baseName}-${env}-alb2`,
      vpcId: vpc.id,
      description: `Security group for internal ALB resource ${timestamp}`,
      // allow all relevant ports
      ingress: [],
      tags: {
        ...baseTags,
        purpose: 'alb-internal'
      },
      egress
    },
    { dependsOn: [vpc] }
  );

  const tableau = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-tableau`,
    {
      name: `${baseName}-${env}-tableau`,
      vpcId: vpc.id,
      description: `Security group for EC2 instance that will be installed with Tableau app ${timestamp}`,
      // allow access from general ALB instance
      ingress: [
        ALLOW_OFFICE_SSH,
        {
          description: 'Allow all ALB to direct HTTP traffic to tableau ec2 intsance',
          protocol: 'tcp',
          fromPort: 80,
          toPort: 80,
          securityGroups: [alb.id, alb2.id]
        },
        {
          description: 'Allow all ALB to direct HTTPS traffic to tableau ec2 intsance',
          protocol: 'tcp',
          fromPort: 443,
          toPort: 443,
          securityGroups: [alb.id, alb2.id]
        }
      ],
      tags: {
        ...baseTags,
        purpose: 'tableau'
      },
      egress
    },
    { dependsOn: [vpc, alb, alb2] }
  );

  const emr = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-emr`,
    {
      name: `${baseName}-${env}-emr`,
      vpcId: vpc.id,
      description: `Security group for EMR service ${timestamp}`,
      // allow access from tableau and internal ALB
      ingress: [],
      tags: {
        ...baseTags,
        purpose: 'emr'
      },
      egress
    },
    { dependsOn: [vpc, alb, alb2, tableau] }
  );

  const emrMaster = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-emr-master`,
    {
      name: `${baseName}-${env}-emr-master`,
      vpcId: vpc.id,
      description: `Security group for EMR master ${timestamp}`,
      tags: {
        ...baseTags,
        purpose: 'emr'
      },
      egress
    },
    { dependsOn: [vpc, alb2, tableau] }
  );

  const emrSlave = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-emr-slave`,
    {
      name: `${baseName}-${env}-emr-slave`,
      vpcId: vpc.id,
      description: `Security group for EMR service ${timestamp}`,
      tags: {
        ...baseTags,
        purpose: 'emr'
      },
      egress
    },
    { dependsOn: [vpc, alb2, tableau] }
  );

  const rds = new aws.ec2.SecurityGroup(
    `${baseName}-${env}-rds`,
    {
      name: `${baseName}-${env}-rds`,
      vpcId: vpc.id,
      description: `Security group for RDS resource ${timestamp}`,
      // only allow access from EMR (for storing metadata)
      ingress: [
        {
          ...baseIngressRule(3306, 'EMR access right'),
          securityGroups: [emr.id]
        }
      ],
      tags: {
        ...baseTags,
        purpose: 'rds'
      },
      egress
    },
    {
      dependsOn: [emr, vpc]
    }
  );

  return { alb, alb2, emr, emrSlave, emrMaster, rds, tableau };
};

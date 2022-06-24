import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws';
import { Vpc } from '@pulumi/awsx/ec2';
import { LoadBalancer } from '@pulumi/aws/lb';
import { SecurityGroup } from '@pulumi/aws/ec2';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb'
};

interface IAlbConfigurationProps {
  env: string;
  albSecurityGroup: SecurityGroup;
  albInternalSecurityGroup: SecurityGroup;
  vpc: Vpc;
}

interface IAlbSettings {
  internal: LoadBalancer;
  external: LoadBalancer;
}

export const configureAlbs = async ({
  env,
  albSecurityGroup,
  albInternalSecurityGroup,
  vpc
}: IAlbConfigurationProps): Promise<IAlbSettings> => {
  const internal = await createInternalAlb(env, albInternalSecurityGroup, vpc);
  const external = await createExternalAlb(env, albSecurityGroup, vpc);

  return Promise.resolve({ internal, external });
};

/**
 * Internal Load Balancer is for specific data engineers to access the respective
 * resources directly via their relevant ports.
 * There will be more listeners created under such load balancer for respective ports.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createInternalAlb = async (env: string, sg: SecurityGroup, vpc: Vpc): Promise<LoadBalancer> => {
  const lbName = `data-lb-${env}-internal`;
  const subnets = await vpc.getSubnetsIds('public');
  const lb = new LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups: [sg.arn],
    enableDeletionProtection: true,
    subnets,
    tags: {
      ...baseTags,
      'alb-type': 'internal'
    }
  });

  return Promise.resolve(lb);
};

/**
 * External Load Balancer is the standard load balancer for http/https (80,443) traffic.
 * There will only be 2 listners crreated for this load balancer.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createExternalAlb = async (env: string, sg: SecurityGroup, vpc: Vpc): Promise<LoadBalancer> => {
  const lbName = `data-lb-${env}-external`;
  const subnets = await vpc.getSubnetsIds('public');
  const lb = new LoadBalancer(lbName, {
    internal: true,
    loadBalancerType: 'application',
    securityGroups: [sg.arn],
    subnets,
    enableDeletionProtection: true,
    tags: {
      ...baseTags,
      'alb-type': 'external'
    }
  });

  return Promise.resolve(lb);
};

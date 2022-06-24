import * as pulumi from '@pulumi/pulumi';

import { Tags } from '@pulumi/aws';
import { LoadBalancer } from '@pulumi/aws/lb';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const tags: Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb'
};

interface IAlbSettings {
  internal: LoadBalancer;
  external: LoadBalancer;
}

export const configureAlbs = (env: string): IAlbSettings => {
  const internal = createInternalAlb(env);
  const external = createExternalAlb(env);

  return { internal, external };
};

/**
 * Internal Load Balancer is for specific data engineers to access the respective
 * resources directly via their relevant ports.
 * There will be more listeners created under such load balancer for respective ports.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createInternalAlb = (env: string): LoadBalancer => {};

/**
 * External Load Balancer is the standard load balancer for http/https (80,443) traffic.
 * There will only be 2 listners crreated for this load balancer.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createExternalAlb = (env: string): LoadBalancer => {};

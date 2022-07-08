import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import { log } from '..';

const pulumiProject = pulumi.getProject();
const stack = pulumi.getStack();
const baseTags: aws.Tags = {
  'pulumi:Project': pulumiProject,
  'pulumi:Stack': stack,
  purpose: 'alb'
};

interface IAlbConfigs {
  vpcId: string;
  subnets: string[];
  securityGroups: string[];
  certificateArn: string;
  baseDomain: string;
}

interface IAlbConfigurationProps {
  env: string;
  ec2: aws.ec2.Instance;
  emr: aws.emr.Cluster;
  jpt: aws.emr.Cluster;
}

interface IAlbSettings {
  internal: aws.lb.LoadBalancer;
  targetGroups: ITargetGroups;
  internalListener: aws.lb.Listener;
}

interface ITargetGroups {
  tableau: aws.lb.TargetGroup;
  tableausm: aws.lb.TargetGroup;
  presto: aws.lb.TargetGroup;
  hue: aws.lb.TargetGroup;
  spark: aws.lb.TargetGroup;
  yarn: aws.lb.TargetGroup;
  livy: aws.lb.TargetGroup;
  hadoop: aws.lb.TargetGroup;
  jupyterHub: aws.lb.TargetGroup;
}

export const configureAlbs = ({ env, ec2, emr, jpt }: IAlbConfigurationProps): IAlbSettings => {
  const config = new pulumi.Config();
  const { vpcId, subnets, securityGroups, certificateArn, baseDomain } =
    config.requireObject<IAlbConfigs>('alb');

  // Create load balancer
  const internal = createInternalAlb(env, subnets, securityGroups);

  // Create target groups
  // Create target group attachment settings in order to register instances to the load balancer
  const targetGroups = createTargetGroups(env, vpcId, ec2, emr, jpt);

  // Create load balancer listeners and their respective listener rules
  const internalListener = createInternalListener(
    env,
    internal,
    certificateArn,
    baseDomain,
    targetGroups
  );

  return { internal, targetGroups, internalListener };
};

const createInternalListener = (
  env: string,
  alb: aws.lb.LoadBalancer,
  certificateArn: string,
  baseDomain: string,
  { tableau, tableausm, jupyterHub, livy, spark, hue, presto, yarn, hadoop }: ITargetGroups
): aws.lb.Listener => {
  const listener = new aws.lb.Listener(`app-mpdw-${env}`, {
    loadBalancerArn: alb.arn,
    port: 443,
    protocol: 'HTTPS',
    sslPolicy: 'ELBSecurityPolicy-2016-08',
    certificateArn,
    defaultActions: [
      {
        type: 'fixed-response',
        fixedResponse: {
          contentType: 'text/plain',
          messageBody: 'Invalid domain name, please check with the IT team',
          statusCode: '200'
        }
      }
    ],
    tags: baseTags
  });

  createListenerRule(`app-mpdw-${env}-tbl`, listener, tableau.arn, baseDomain, 'tableau');
  createListenerRule(`app-mpdw-${env}-tsm`, listener, tableausm.arn, baseDomain, 'tableausm');
  createListenerRule(`app-mpdw-${env}-jp`, listener, jupyterHub.arn, baseDomain, 'jupyter');
  createListenerRule(`app-mpdw-${env}-livy`, listener, livy.arn, baseDomain, 'livy');
  createListenerRule(`app-mpdw-${env}-spark`, listener, spark.arn, baseDomain, 'spark');
  createListenerRule(`app-mpdw-${env}-hue`, listener, hue.arn, baseDomain, 'hue');
  createListenerRule(`app-mpdw-${env}-presto`, listener, presto.arn, baseDomain, 'presto');
  createListenerRule(`app-mpdw-${env}-yarn`, listener, yarn.arn, baseDomain, 'yarn');
  createListenerRule(`app-mpdw-${env}-hadoop`, listener, hadoop.arn, baseDomain, 'hadoop');

  return listener;
};

const createListenerRule = (
  name: string,
  listener: aws.lb.Listener,
  targetGroupArn: pulumi.Output<string>,
  baseDomain: string,
  domain: string
) => {
  return new aws.lb.ListenerRule(
    name,
    {
      listenerArn: listener.arn,
      actions: [
        {
          type: 'forward',
          targetGroupArn
        }
      ],
      conditions: [
        {
          hostHeader: {
            values: [`${domain}.dataplatform.${baseDomain}`]
          }
        }
      ],
      tags: baseTags
    },
    { dependsOn: [listener] }
  );
};

const createTargetGroups = (
  env: string,
  vpcId: string,
  ec2: aws.ec2.Instance,
  emr: aws.emr.Cluster,
  jpt: aws.emr.Cluster
): ITargetGroups => {
  const properties = {
    protocol: 'HTTP',
    vpcId,
    tags: { ...baseTags }
  };

  const tableau = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tableau`, {
    ...properties,
    port: 80
  });
  new aws.lb.TargetGroupAttachment(
    `app-mpdw-tgatt-${env}-tableau`,
    {
      targetGroupArn: tableau.arn,
      targetId: ec2.id,
      port: 80
    },
    { dependsOn: [tableau, ec2] }
  );

  const tableausm = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-tsm`, {
    ...properties,
    port: 8850,
    protocol: 'HTTPS'
  });
  new aws.lb.TargetGroupAttachment(
    `app-mpdw-tgatt-${env}-tsm`,
    {
      targetGroupArn: tableausm.arn,
      targetId: ec2.id,
      port: 8850
    },
    { dependsOn: [tableausm, ec2] }
  );

  // master-public-dns-name
  const jupyterHub = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-jh`, {
    ...properties,
    port: 9443
  });
  // register target
  jpt.id.apply(async (clusterId) => {
    log('info', `The Jupyter master cluster id: ${clusterId}`);

    const { ids } = await aws.ec2.getInstances({
      filters: [
        { name: 'tag:aws:elasticmapreduce:job-flow-id', values: [clusterId] },
        { name: 'tag:aws:elasticmapreduce:instance-group-role', values: ['MASTER'] }
      ]
    });

    log('info', `The instance IDs for jupyter master nodes are: ${ids}`);

    ids.forEach((id, index) => {
      // register the master instances to target groups
      new aws.lb.TargetGroupAttachment(
        `jupyter-${id}`,
        {
          targetGroupArn: jupyterHub.arn,
          targetId: id,
          port: 9443
        },
        {
          dependsOn: [jupyterHub, jpt]
        }
      );

      // adding additional tags to these ec2 instances
      new aws.ec2.Tag(
        `jupyter-${id}`,
        {
          resourceId: id,
          key: 'Name',
          value: `app-mpdw-jupyter-master-${index}`
        },
        { dependsOn: [jpt] }
      );
    });

    const { ids: cores } = await aws.ec2.getInstances({
      filters: [
        { name: 'tag:aws:elasticmapreduce:job-flow-id', values: [clusterId] },
        { name: 'tag:aws:elasticmapreduce:instance-group-role', values: ['CORE'] }
      ]
    });

    cores.forEach((id, index) => {
      // adding additional tags to these ec2 instances
      new aws.ec2.Tag(
        `jupyterc-${id}`,
        {
          resourceId: id,
          key: 'Name',
          value: `app-mpdw-jupyter-core-${index}`
        },
        { dependsOn: [jpt] }
      );
    });
  });

  // master-public-dns-name
  const presto = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-presto`, {
    ...properties,
    port: 8889
  });

  // master-public-dns-name
  const hue = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-hue`, {
    ...properties,
    port: 8888
  });

  // master-public-dns-name
  const spark = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-spark`, {
    ...properties,
    port: 18080
  });

  // master-public-dns-name
  const yarn = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-yarn`, {
    ...properties,
    port: 8088
  });

  // master-public-dns-name
  const livy = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-livy`, {
    ...properties,
    port: 8998
  });

  // master-public-dns-name
  const hadoop = new aws.lb.TargetGroup(`app-mpdw-tg-${env}-hadoop`, {
    ...properties,
    port: 9870
  });
  const tgs: { tg: aws.lb.TargetGroup; name: string; port: number }[] = [
    { tg: presto, name: 'presto', port: 8889 },
    { tg: hue, name: 'hue', port: 8888 },
    { tg: spark, name: 'spark', port: 18080 },
    { tg: yarn, name: 'yarn', port: 8088 },
    { tg: livy, name: 'livy', port: 8998 },
    { tg: hadoop, name: 'hadoop', port: 9870 }
  ];

  // register target
  emr.id.apply(async (clusterId) => {
    log('info', `The EMR master cluster id: ${clusterId}`);

    const { ids } = await aws.ec2.getInstances({
      filters: [
        { name: 'tag:aws:elasticmapreduce:job-flow-id', values: [clusterId] },
        { name: 'tag:aws:elasticmapreduce:instance-group-role', values: ['MASTER'] }
      ]
    });

    log('info', `The instance IDs for EMR master nodes are: ${ids}`);

    ids.forEach((id, index) => {
      tgs.forEach((tg) => {
        new aws.lb.TargetGroupAttachment(
          `${tg.name}-${id}`,
          {
            targetGroupArn: tg.tg.arn,
            targetId: id,
            port: tg.port
          },
          {
            dependsOn: [tg.tg, emr]
          }
        );
      });

      // adding additional tags to these ec2 instances
      new aws.ec2.Tag(
        `emr-${id}`,
        {
          resourceId: id,
          key: 'Name',
          value: `app-mpdw-emr-master-${index}`
        },
        { dependsOn: [emr] }
      );
    });

    const { ids: cores } = await aws.ec2.getInstances({
      filters: [
        { name: 'tag:aws:elasticmapreduce:job-flow-id', values: [clusterId] },
        { name: 'tag:aws:elasticmapreduce:instance-group-role', values: ['CORE'] }
      ]
    });

    cores.forEach((id, index) => {
      // adding additional tags to these ec2 instances
      new aws.ec2.Tag(
        `emr-${id}`,
        {
          resourceId: id,
          key: 'Name',
          value: `app-mpdw-emr-core-${index}`
        },
        { dependsOn: [jpt] }
      );
    });
  });

  return { tableau, tableausm, jupyterHub, livy, spark, presto, hue, hadoop, yarn };
};

/**
 * Internal Load Balancer is for specific data engineers to access the respective
 * resources directly via their relevant ports.
 * There will be more listeners created under such load balancer for respective ports.
 *
 * @param env The pulumi environment key, such as `dev`
 */
const createInternalAlb = (
  env: string,
  subnets: string[],
  securityGroups: string[]
): aws.lb.LoadBalancer => {
  const lbName = `app-mpdw-lb-${env}`;
  const lb = new aws.lb.LoadBalancer(lbName, {
    internal: false,
    loadBalancerType: 'application',
    securityGroups,
    subnets,
    enableDeletionProtection: false,
    tags: {
      ...baseTags,
      'alb-type': 'internal'
    }
  });

  return lb;
};

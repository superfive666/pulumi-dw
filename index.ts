import * as pulumi from "@pulumi/pulumi";

import { configureVpc } from "./src/vpc";
import { configureIamRole } from "./src/iam";
import { configureEc2Instance } from "./src/ec2";
import { configureEmrCluster } from "./src/mer";
import { configureAlbs } from "./src/alb";

// GLOBAL config variables
const env = pulumi.getStack();
log("info", `Current pulumi environment building is ${env}`);

// Create necessary IAM roles for AWS resources
const roles = configureIamRole();
log("info", `IAM roles are created: ${roles}`);

// Create required VPC for the data-platform
const {} = configureVpc(env);
log("info", `VPC created successfully`);

// Create EC2 instance for installation of Tableau
const tableau = configureEc2Instance(env);
log(
  "info",
  `EC2 instance for installing tableau completed successfully: ${tableau}`
);

// Create EMR cluster
const emr = configureEmrCluster(env);
log("info", `EMR cluster created successfully`);

// Create relevant ALBs including respective target groups
const albs = configureAlbs(env);
log("info", `All ALBs are created successfully`)

const log = (level: "info" | "warning" | "error", message: string) => {
  const formatted = `${new Date().toISOString()} [${level}]: ${message}`;
  console.log(formatted);
};

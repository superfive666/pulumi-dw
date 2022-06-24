import * as pulumi from "@pulumi/pulumi";

import { configureVpc } from "./src/vpc";

// GLOBAL config variables
const env = pulumi.getStack();

// Create required VPC for the data-platform
configureVpc(env);

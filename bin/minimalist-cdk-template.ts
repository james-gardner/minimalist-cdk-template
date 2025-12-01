#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { MinimalistCdkTemplateStack } from '../lib/minimalist-cdk-template-stack';

const app = new cdk.App();

// Read configuration from CDK context
// These can be provided via:
//   - cdk.json context section
//   - Command line: cdk deploy -c stackName=MyStack -c region=eu-west-1
const stackName = app.node.tryGetContext('stackName') ?? 'MinimalistCdkTemplateStack';
const region = app.node.tryGetContext('region') ?? 'eu-west-2';
const account = app.node.tryGetContext('account');

// EC2 configuration
const ec2InstanceClass = app.node.tryGetContext('ec2InstanceClass') ?? 'T3';
const ec2InstanceSize = app.node.tryGetContext('ec2InstanceSize') ?? 'MICRO';

// RDS configuration
const rdsInstanceClass = app.node.tryGetContext('rdsInstanceClass') ?? 'T3';
const rdsInstanceSize = app.node.tryGetContext('rdsInstanceSize') ?? 'MICRO';
const databaseName = app.node.tryGetContext('databaseName') ?? 'appdb';
const allocatedStorage = parseInt(app.node.tryGetContext('allocatedStorage') ?? '20', 10);

// VPC configuration
const vpcCidr = app.node.tryGetContext('vpcCidr') ?? '10.0.0.0/16';
const maxAzs = parseInt(app.node.tryGetContext('maxAzs') ?? '2', 10);

// Helper function to get InstanceClass from string
function getInstanceClass(className: string): ec2.InstanceClass {
  const upperClassName = className.toUpperCase();
  return (ec2.InstanceClass as Record<string, ec2.InstanceClass>)[upperClassName] ?? ec2.InstanceClass.T3;
}

// Helper function to get InstanceSize from string
function getInstanceSize(sizeName: string): ec2.InstanceSize {
  const upperSizeName = sizeName.toUpperCase();
  return (ec2.InstanceSize as Record<string, ec2.InstanceSize>)[upperSizeName] ?? ec2.InstanceSize.MICRO;
}

// Create the stack with parameterized configuration
new MinimalistCdkTemplateStack(app, stackName, {
  env: {
    region: region,
    account: account, // If not provided, uses CDK_DEFAULT_ACCOUNT
  },
  instanceType: ec2.InstanceType.of(
    getInstanceClass(ec2InstanceClass),
    getInstanceSize(ec2InstanceSize)
  ),
  rdsInstanceClass: getInstanceClass(rdsInstanceClass),
  rdsInstanceSize: getInstanceSize(rdsInstanceSize),
  databaseName: databaseName,
  allocatedStorage: allocatedStorage,
  vpcCidr: vpcCidr,
  maxAzs: maxAzs,
});

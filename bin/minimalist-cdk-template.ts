#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { MinimalistCdkTemplateStack } from '../lib/minimalist-cdk-template-stack';

const app = new cdk.App();

// Create the stack in London region (eu-west-2)
new MinimalistCdkTemplateStack(app, 'MinimalistCdkTemplateStack', {
  env: {
    region: 'eu-west-2', // London region
  },
  // Instance type is parameterized via props.instanceType
  // Defaults to t3.micro for free tier eligibility
});

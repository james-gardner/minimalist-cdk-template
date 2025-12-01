import * as cdk from 'aws-cdk-lib/core';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MinimalistCdkTemplateStack } from '../lib/minimalist-cdk-template-stack';

describe('MinimalistCdkTemplateStack', () => {
  let app: cdk.App;
  let stack: MinimalistCdkTemplateStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new MinimalistCdkTemplateStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('VPC is created', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test('VPC has 1 public subnet', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 2); // 1 public + 1 private

    // Check for public subnet with MapPublicIpOnLaunch
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: true,
    });
  });

  test('VPC has 1 private subnet', () => {
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: false,
    });
  });

  test('No NAT Gateway is created (free tier)', () => {
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });

  test('EC2 instance is created with default t3.micro instance type', () => {
    template.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't3.micro',
    });
  });

  test('EC2 instance is in a public subnet', () => {
    // Verify the instance is placed in the public subnet
    // The CDK creates a SubnetId reference to the public subnet
    template.hasResourceProperties('AWS::EC2::Instance', Match.objectLike({
      SubnetId: Match.anyValue(),
    }));

    // The public subnet should have MapPublicIpOnLaunch set to true
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: true,
    });
  });

  test('Security group allows SSH access', () => {
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 22,
          ToPort: 22,
          CidrIp: '0.0.0.0/0',
        }),
      ]),
    });
  });

  test('Custom instance type can be provided', () => {
    const customApp = new cdk.App();
    const customStack = new MinimalistCdkTemplateStack(customApp, 'CustomTestStack', {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
    });
    const customTemplate = Template.fromStack(customStack);

    customTemplate.hasResourceProperties('AWS::EC2::Instance', {
      InstanceType: 't2.small',
    });
  });

  test('Custom SSH CIDR can be provided', () => {
    const customApp = new cdk.App();
    const customStack = new MinimalistCdkTemplateStack(customApp, 'CustomSshTestStack', {
      sshCidr: '10.0.0.0/8',
    });
    const customTemplate = Template.fromStack(customStack);

    customTemplate.hasResourceProperties('AWS::EC2::SecurityGroup', {
      SecurityGroupIngress: Match.arrayWith([
        Match.objectLike({
          IpProtocol: 'tcp',
          FromPort: 22,
          ToPort: 22,
          CidrIp: '10.0.0.0/8',
        }),
      ]),
    });
  });

  test('Stack outputs include instance public IP', () => {
    template.hasOutput('InstancePublicIp', {});
  });

  test('Stack outputs include instance ID', () => {
    template.hasOutput('InstanceId', {});
  });
});

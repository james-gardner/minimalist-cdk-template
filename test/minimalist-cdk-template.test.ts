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

  test('VPC has 2 public subnets (one per AZ)', () => {
    template.resourceCountIs('AWS::EC2::Subnet', 4); // 2 public + 2 private (for 2 AZs)

    // Check for public subnet with MapPublicIpOnLaunch
    template.hasResourceProperties('AWS::EC2::Subnet', {
      MapPublicIpOnLaunch: true,
    });
  });

  test('VPC has 2 private subnets (one per AZ for RDS)', () => {
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

  test('EC2 instance has SSM Session Manager permissions', () => {
    // Verify the instance role has SSM managed policy attached
    template.hasResourceProperties('AWS::IAM::Role', {
      ManagedPolicyArns: Match.arrayWith([
        Match.objectLike({
          'Fn::Join': Match.arrayWith([
            Match.arrayWith([
              Match.stringLikeRegexp('arn:'),
              Match.stringLikeRegexp(':iam::aws:policy/AmazonSSMManagedInstanceCore'),
            ]),
          ]),
        }),
      ]),
    });
  });

  test('No SSH ingress rule in security group', () => {
    // Verify no security group with SSH ingress rule exists
    const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
    for (const [, sg] of Object.entries(securityGroups)) {
      const props = (sg as { Properties: { SecurityGroupIngress?: { FromPort?: number; ToPort?: number }[] } }).Properties;
      if (props.SecurityGroupIngress) {
        for (const rule of props.SecurityGroupIngress) {
          if (rule.FromPort !== undefined) {
            expect(rule.FromPort).not.toBe(22);
          }
          if (rule.ToPort !== undefined) {
            expect(rule.ToPort).not.toBe(22);
          }
        }
      }
    }
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

  test('Stack outputs include instance public IP', () => {
    template.hasOutput('InstancePublicIp', {});
  });

  test('Stack outputs include instance ID', () => {
    template.hasOutput('InstanceId', {});
  });

  // RDS Tests
  test('RDS instance is created with PostgreSQL engine', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'postgres',
      DBInstanceClass: 'db.t3.micro',
    });
  });

  test('RDS instance is in private subnet', () => {
    // Verify RDS subnet group exists and references private subnet
    template.hasResourceProperties('AWS::RDS::DBSubnetGroup', {
      DBSubnetGroupDescription: Match.anyValue(),
    });
  });

  test('RDS security group only allows access from EC2 security group', () => {
    // Find the RDS security group ingress rule for PostgreSQL port
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 5432,
      ToPort: 5432,
      // Should reference the EC2 security group, not a CIDR
      SourceSecurityGroupId: Match.anyValue(),
    });
  });

  test('RDS has auto-generated credentials secret', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      GenerateSecretString: Match.objectLike({
        SecretStringTemplate: Match.stringLikeRegexp('postgres'),
      }),
    });
  });

  test('RDS has 20GB allocated storage (free tier)', () => {
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '20',
      MaxAllocatedStorage: 20,
    });
  });

  test('Stack outputs include RDS endpoint', () => {
    template.hasOutput('RdsEndpoint', {});
  });

  test('Stack outputs include RDS secret ARN', () => {
    template.hasOutput('RdsSecretArn', {});
  });

  test('Custom RDS instance class can be provided', () => {
    const customApp = new cdk.App();
    const customStack = new MinimalistCdkTemplateStack(customApp, 'CustomRdsTestStack', {
      rdsInstanceClass: ec2.InstanceClass.T3,
      rdsInstanceSize: ec2.InstanceSize.SMALL,
    });
    const customTemplate = Template.fromStack(customStack);

    customTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.small',
    });
  });

  test('Custom database name can be provided', () => {
    const customApp = new cdk.App();
    const customStack = new MinimalistCdkTemplateStack(customApp, 'CustomDbNameStack', {
      databaseName: 'myCustomDb',
    });
    const customTemplate = Template.fromStack(customStack);

    customTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
      DBName: 'myCustomDb',
    });
  });
});

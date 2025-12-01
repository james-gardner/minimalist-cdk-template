# Minimalist CDK Template

AWS CDK TypeScript project that creates a VPC with an EC2 instance for the London region (eu-west-2).

## Architecture

This stack creates:

- **VPC** with a single Availability Zone
- **Public Subnet** (CIDR: 10.0.0.0/24) with auto-assign public IP
- **Private Subnet** (CIDR: 10.0.1.0/24) - isolated, no NAT gateway
- **EC2 Instance** (default: t3.micro for free tier eligibility) in the public subnet
- **SSM Session Manager** access enabled (no SSH ports opened)

## Free Tier Considerations

- Uses t3.micro instance type (free tier eligible)
- No NAT Gateway (saves costs)
- Single AZ deployment

## Configuration

The stack accepts the following optional props:

### Instance Type

The instance type is parameterized and can be changed by passing a different `instanceType` prop:

```typescript
new MinimalistCdkTemplateStack(app, 'MinimalistCdkTemplateStack', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
});
```

## Accessing the Instance

This stack uses **AWS Systems Manager Session Manager** for secure access instead of SSH. No ports are opened in the security group.

To connect to the instance:

```bash
aws ssm start-session --target <instance-id>
```

Or use the AWS Console: EC2 → Instances → Select Instance → Connect → Session Manager

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js and npm installed
- CDK bootstrapped in your AWS account (`npx cdk bootstrap`)
- Session Manager plugin installed for AWS CLI (for `aws ssm start-session`)

## Outputs

After deployment, the stack outputs:
- `InstancePublicIp` - Public IP address of the EC2 instance
- `InstanceId` - Instance ID of the EC2 instance (use this with SSM)

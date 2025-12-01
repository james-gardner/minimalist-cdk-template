# Minimalist CDK Template

AWS CDK TypeScript project that creates a VPC with an EC2 instance for the London region (eu-west-2).

## Architecture

This stack creates:

- **VPC** with a single Availability Zone
- **Public Subnet** (CIDR: 10.0.0.0/24) with auto-assign public IP
- **Private Subnet** (CIDR: 10.0.1.0/24) - isolated, no NAT gateway
- **EC2 Instance** (default: t3.micro for free tier eligibility) in the public subnet
- **Security Group** allowing SSH access (port 22)

## Free Tier Considerations

- Uses t3.micro instance type (free tier eligible)
- No NAT Gateway (saves costs)
- Single AZ deployment

## Configuration

The instance type is parameterized and can be changed by passing a different `instanceType` prop:

```typescript
new MinimalistCdkTemplateStack(app, 'MinimalistCdkTemplateStack', {
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.SMALL),
});
```

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

## Outputs

After deployment, the stack outputs:
- `InstancePublicIp` - Public IP address of the EC2 instance
- `InstanceId` - Instance ID of the EC2 instance

/**
 * Unit tests for policy parser utilities
 */

import {
  isValidPolicyDocument,
  normalizeStatement,
  parsePolicyDocument,
  parsePolicyObject,
  extractActionsFromPolicy,
  policyAllowsAction
} from '../policy-parser';
import type { IAMPolicyDocument, IAMPolicyStatement } from '@/types/aws';

describe('policy-parser', () => {
  describe('isValidPolicyDocument', () => {
    it('should return true for valid policy document', () => {
      const validPolicy = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*'
        }]
      };
      
      expect(isValidPolicyDocument(validPolicy)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidPolicyDocument(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidPolicyDocument('not an object')).toBe(false);
    });

    it('should return false for object without Statement', () => {
      expect(isValidPolicyDocument({ Version: '2012-10-17' })).toBe(false);
    });
  });

  describe('normalizeStatement', () => {
    it('should normalize single action to array', () => {
      const statement: IAMPolicyStatement = {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: '*'
      };

      const result = normalizeStatement(statement);

      expect(result.effect).toBe('Allow');
      expect(result.actions).toEqual(['s3:GetObject']);
      expect(result.resources).toEqual(['*']);
    });

    it('should keep action array as is', () => {
      const statement: IAMPolicyStatement = {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: ['arn:aws:s3:::bucket/*']
      };

      const result = normalizeStatement(statement);

      expect(result.actions).toEqual(['s3:GetObject', 's3:PutObject']);
      expect(result.resources).toEqual(['arn:aws:s3:::bucket/*']);
    });

    it('should default to Allow effect', () => {
      const statement: IAMPolicyStatement = {
        Action: 's3:GetObject',
        Resource: '*'
      };

      const result = normalizeStatement(statement);

      expect(result.effect).toBe('Allow');
    });

    it('should handle NotAction and NotResource', () => {
      const statement: IAMPolicyStatement = {
        Effect: 'Deny',
        NotAction: 's3:DeleteObject',
        NotResource: 'arn:aws:s3:::sensitive-bucket/*'
      };

      const result = normalizeStatement(statement);

      expect(result.effect).toBe('Deny');
      expect(result.actions).toEqual([]);
      expect(result.resources).toEqual(['*']);
    });

    it('should include conditions', () => {
      const statement: IAMPolicyStatement = {
        Effect: 'Allow',
        Action: 's3:GetObject',
        Resource: '*',
        Condition: {
          StringEquals: {
            's3:x-amz-server-side-encryption': 'AES256'
          }
        }
      };

      const result = normalizeStatement(statement);

      expect(result.conditions).toBeDefined();
      expect(result.conditions).toHaveProperty('StringEquals');
    });
  });

  describe('parsePolicyDocument', () => {
    it('should parse URL-encoded policy document', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Action: 's3:GetObject',
          Resource: '*'
        }]
      };
      const encodedPolicy = encodeURIComponent(JSON.stringify(policy));

      const result = parsePolicyDocument(encodedPolicy);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].actions).toEqual(['s3:GetObject']);
      }
    });

    it('should return error for invalid URI encoding', () => {
      const invalidEncoding = '%E0%A4%A';

      const result = parsePolicyDocument(invalidEncoding);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to decode');
      }
    });

    it('should return error for invalid JSON', () => {
      const invalidJSON = encodeURIComponent('{ not valid json }');

      const result = parsePolicyDocument(invalidJSON);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Failed to parse policy JSON');
      }
    });

    it('should return error for missing Statement', () => {
      const invalidPolicy = encodeURIComponent(JSON.stringify({ Version: '2012-10-17' }));

      const result = parsePolicyDocument(invalidPolicy);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Invalid policy document structure');
      }
    });

    it('should handle multiple statements', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
          { Effect: 'Allow', Action: 's3:PutObject', Resource: '*' }
        ]
      };
      const encodedPolicy = encodeURIComponent(JSON.stringify(policy));

      const result = parsePolicyDocument(encodedPolicy);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });

  describe('parsePolicyObject', () => {
    it('should parse policy object with array of statements', () => {
      const policy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
          { Effect: 'Allow', Action: 'ec2:DescribeInstances', Resource: '*' }
        ]
      };

      const result = parsePolicyObject(policy);

      expect(result).toHaveLength(2);
      expect(result[0].actions).toEqual(['s3:GetObject']);
      expect(result[1].actions).toEqual(['ec2:DescribeInstances']);
    });

    it('should handle single statement object', () => {
      const policy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: { Effect: 'Allow', Action: 's3:*', Resource: '*' }
      };

      const result = parsePolicyObject(policy);

      expect(result).toHaveLength(1);
      expect(result[0].actions).toEqual(['s3:*']);
    });
  });

  describe('extractActionsFromPolicy', () => {
    it('should extract actions from policy string', () => {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: '*' },
          { Effect: 'Allow', Action: 'ec2:DescribeInstances', Resource: '*' }
        ]
      };
      const encodedPolicy = encodeURIComponent(JSON.stringify(policy));

      const result = extractActionsFromPolicy(encodedPolicy);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.size).toBe(3);
        expect(result.data.has('s3:GetObject')).toBe(true);
        expect(result.data.has('s3:PutObject')).toBe(true);
        expect(result.data.has('ec2:DescribeInstances')).toBe(true);
      }
    });

    it('should extract actions from policy object', () => {
      const policy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }]
      };

      const result = extractActionsFromPolicy(policy);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.has('s3:*')).toBe(true);
      }
    });

    it('should return unique actions', () => {
      const policy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: [
          { Effect: 'Allow', Action: 's3:GetObject', Resource: '*' },
          { Effect: 'Allow', Action: 's3:GetObject', Resource: 'arn:aws:s3:::bucket/*' }
        ]
      };

      const result = extractActionsFromPolicy(policy);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.size).toBe(1);
      }
    });
  });

  describe('policyAllowsAction', () => {
    const policy: IAMPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        { Effect: 'Allow', Action: ['s3:GetObject', 's3:PutObject'], Resource: '*' },
        { Effect: 'Allow', Action: 'ec2:Describe*', Resource: '*' }
      ]
    };

    it('should return true for exact match', () => {
      expect(policyAllowsAction(policy, 's3:GetObject')).toBe(true);
      expect(policyAllowsAction(policy, 's3:PutObject')).toBe(true);
    });

    it('should return true for service wildcard match', () => {
      const wildcardPolicy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: 's3:*', Resource: '*' }]
      };

      expect(policyAllowsAction(wildcardPolicy, 's3:GetObject')).toBe(true);
      expect(policyAllowsAction(wildcardPolicy, 's3:DeleteBucket')).toBe(true);
    });

    it('should return true for full wildcard', () => {
      const adminPolicy: IAMPolicyDocument = {
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }]
      };

      expect(policyAllowsAction(adminPolicy, 's3:GetObject')).toBe(true);
      expect(policyAllowsAction(adminPolicy, 'ec2:TerminateInstances')).toBe(true);
    });

    it('should return true for partial wildcard match', () => {
      expect(policyAllowsAction(policy, 'ec2:DescribeInstances')).toBe(true);
      expect(policyAllowsAction(policy, 'ec2:DescribeVolumes')).toBe(true);
    });

    it('should return false for non-matching action', () => {
      expect(policyAllowsAction(policy, 's3:DeleteObject')).toBe(false);
      expect(policyAllowsAction(policy, 'iam:CreateUser')).toBe(false);
    });

    it('should return false for invalid policy document', () => {
      const invalidPolicy = 'not a valid policy';

      expect(policyAllowsAction(invalidPolicy, 's3:GetObject')).toBe(false);
    });
  });
});

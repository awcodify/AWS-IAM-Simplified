/**
 * Unit tests for AccountService
 * Tests STS and account information operations
 */

import { AccountService } from '../account-service';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { OrganizationsClient, DescribeAccountCommand } from '@aws-sdk/client-organizations';
import { IAMClient, ListAccountAliasesCommand } from '@aws-sdk/client-iam';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-sts');
jest.mock('@aws-sdk/client-organizations');
jest.mock('@aws-sdk/client-iam');

describe('AccountService', () => {
  let accountService: AccountService;
  let mockSTSClient: jest.Mocked<STSClient>;
  let mockOrganizationsClient: jest.Mocked<OrganizationsClient>;
  let mockIAMClient: jest.Mocked<IAMClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create service instance
    accountService = new AccountService('us-east-1', {
      accessKeyId: 'test-key-id',
      secretAccessKey: 'test-secret',
    });

    // Get mocked client instances
    mockSTSClient = (accountService as any).stsClient;
    mockOrganizationsClient = (accountService as any).organizationsClient;
    mockIAMClient = (accountService as any).iamClient;
  });

  describe('getAccountInfo', () => {
    it('should return account information successfully', async () => {
      // Mock GetCallerIdentity response
      const mockIdentity = {
        Account: '123456789012',
        UserId: 'AIDAI1234567890ABCDEF',
        Arn: 'arn:aws:iam::123456789012:user/testuser',
      };

      // Mock DescribeAccount response (Organizations)
      const mockOrgAccount = {
        Account: {
          Id: '123456789012',
          Name: 'My Test Account',
          Email: 'test@example.com',
          Status: 'ACTIVE',
        },
      };

      // Setup mock responses
      mockSTSClient.send = jest.fn().mockResolvedValueOnce(mockIdentity);
      mockOrganizationsClient.send = jest.fn().mockResolvedValueOnce(mockOrgAccount);

      const result = await accountService.getAccountInfo();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountId).toBe('123456789012');
        expect(result.data.userId).toBe('AIDAI1234567890ABCDEF');
        expect(result.data.arn).toBe('arn:aws:iam::123456789012:user/testuser');
        expect(result.data.accountName).toBe('My Test Account');
      }
    });

    it('should handle missing account alias', async () => {
      const mockIdentity = {
        Account: '123456789012',
        UserId: 'AIDAI1234567890ABCDEF',
        Arn: 'arn:aws:iam::123456789012:user/testuser',
      };

      // Organizations call fails
      mockSTSClient.send = jest.fn().mockResolvedValueOnce(mockIdentity);
      mockOrganizationsClient.send = jest.fn().mockRejectedValueOnce(new Error('Not in org'));

      // IAM call returns empty aliases
      const mockAliases = {
        AccountAliases: [],
      };
      mockIAMClient.send = jest.fn().mockResolvedValueOnce(mockAliases);

      const result = await accountService.getAccountInfo();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountName).toBeUndefined();
      }
    });

    it('should handle STS errors gracefully', async () => {
      mockSTSClient.send = jest.fn().mockRejectedValue(new Error('Access Denied'));

      const result = await accountService.getAccountInfo();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Access Denied');
      }
    });

    it('should continue without account name if IAM call fails', async () => {
      const mockIdentity = {
        Account: '123456789012',
        UserId: 'AIDAI1234567890ABCDEF',
        Arn: 'arn:aws:iam::123456789012:user/testuser',
      };

      // Both Organizations and IAM calls fail
      mockSTSClient.send = jest.fn().mockResolvedValueOnce(mockIdentity);
      mockOrganizationsClient.send = jest.fn().mockRejectedValueOnce(new Error('Org Error'));
      mockIAMClient.send = jest.fn().mockRejectedValueOnce(new Error('IAM Error'));

      const result = await accountService.getAccountInfo();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountId).toBe('123456789012');
        expect(result.data.accountName).toBeUndefined();
      }
    });
  });

  describe('constructor', () => {
    it('should create service with default region', () => {
      const service = new AccountService();
      expect(service).toBeInstanceOf(AccountService);
    });

    it('should create service with custom region', () => {
      const service = new AccountService('eu-west-1');
      expect(service).toBeInstanceOf(AccountService);
    });

    it('should create service with credentials', () => {
      const service = new AccountService('us-west-2', {
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        sessionToken: 'test-token',
      });
      expect(service).toBeInstanceOf(AccountService);
    });
  });
});

/**
 * Unit tests for UserService
 * Tests the refactored methods from large function refactoring
 */

import { UserService } from '../user-service';
import { IAMClient } from '@aws-sdk/client-iam';
import { IdentitystoreClient } from '@aws-sdk/client-identitystore';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-iam');
jest.mock('@aws-sdk/client-identitystore');

describe('UserService', () => {
  let userService: UserService;
  let mockIAMClient: jest.Mocked<IAMClient>;
  let mockIdentityStoreClient: jest.Mocked<IdentitystoreClient>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create service instance
    userService = new UserService('us-east-1', { 
      accessKeyId: 'test', 
      secretAccessKey: 'test' 
    });

    // Get mocked client instances
    mockIAMClient = (userService as any).iamClient;
    mockIdentityStoreClient = (userService as any).identityStoreClient;

    // Setup send as a mock function
    mockIAMClient.send = jest.fn();
    mockIdentityStoreClient.send = jest.fn();
  });

  describe('getIAMUserPermissions', () => {
    const mockUserName = 'test-user';
    const mockUser = {
      UserName: 'test-user',
      UserId: 'AIDAI123456789',
      Arn: 'arn:aws:iam::123456789012:user/test-user',
      CreateDate: new Date('2024-01-01'),
      Path: '/'
    };

    it('should fetch user details successfully', async () => {
      // Mock GetUserCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        User: mockUser
      });

      // Mock other parallel calls (minimal - no policies/groups)
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AttachedPolicies: []
      });
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        PolicyNames: []
      });
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        Groups: []
      });
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AccessKeyMetadata: []
      });

      const result = await userService.getIAMUserPermissions(mockUserName);

      expect(result).not.toBeNull();
      expect(result?.user.UserName).toBe(mockUserName);
      expect(result?.user.UserId).toBe('AIDAI123456789');
    });

    it('should return null when user does not exist', async () => {
      // Mock GetUserCommand returning error
      (mockIAMClient.send as jest.Mock).mockRejectedValueOnce(new Error('User not found'));

      const result = await userService.getIAMUserPermissions('non-existent-user');

      expect(result).toBeNull();
    });

    it('should handle users with no policies gracefully', async () => {
      // Mock GetUserCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        User: mockUser
      });

      // Mock ListAttachedUserPoliciesCommand - no policies
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AttachedPolicies: []
      });

      // Mock ListUserPoliciesCommand - no inline policies
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        PolicyNames: []
      });

      // Mock ListGroupsForUserCommand - no groups
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        Groups: []
      });

      // Mock ListAccessKeysCommand - no keys
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AccessKeyMetadata: []
      });

      const result = await userService.getIAMUserPermissions(mockUserName);

      expect(result).not.toBeNull();
      expect(result?.user.UserName).toBe(mockUserName);
      expect(result?.attachedPolicies).toHaveLength(0);
      expect(result?.inlinePolicies).toHaveLength(0);
      expect(result?.groups).toHaveLength(0);
      expect(result?.accessKeys).toHaveLength(0);
    });

    it('should handle inline policy parsing errors gracefully', async () => {
      // Mock GetUserCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        User: mockUser
      });

      // Mock ListAttachedUserPoliciesCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AttachedPolicies: []
      });

      // Mock ListUserPoliciesCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        PolicyNames: ['bad-policy']
      });

      // Mock ListGroupsForUserCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        Groups: []
      });

      // Mock ListAccessKeysCommand
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AccessKeyMetadata: []
      });

      // Mock GetUserPolicyCommand with invalid JSON
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        PolicyName: 'bad-policy',
        PolicyDocument: 'invalid-json'
      });

      const result = await userService.getIAMUserPermissions(mockUserName);

      expect(result).not.toBeNull();
      expect(result?.user.UserName).toBe(mockUserName);
      // Invalid policy returns but with empty permissions
      expect(result?.inlinePolicies).toHaveLength(1);
      expect(result?.inlinePolicies[0].permissions).toHaveLength(0);
    });
  });

  describe('getAccessKeys', () => {
    const mockUserName = 'test-user';

    it('should fetch access keys successfully', async () => {
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AccessKeyMetadata: [
          {
            AccessKeyId: 'AKIAI123456789',
            Status: 'Active',
            CreateDate: new Date('2024-01-01'),
            UserName: mockUserName
          },
          {
            AccessKeyId: 'AKIAI987654321',
            Status: 'Inactive',
            CreateDate: new Date('2023-01-01'),
            UserName: mockUserName
          }
        ]
      });

      const result = await userService.getAccessKeys(mockUserName);

      expect(result).toHaveLength(2);
      expect(result[0].AccessKeyId).toBe('AKIAI123456789');
      expect(result[0].Status).toBe('Active');
      expect(result[1].Status).toBe('Inactive');
    });

    it('should return empty array when fetch fails', async () => {
      (mockIAMClient.send as jest.Mock).mockRejectedValueOnce(new Error('Access denied'));

      const result = await userService.getAccessKeys(mockUserName);

      expect(result).toHaveLength(0);
    });

    it('should handle users with no access keys', async () => {
      (mockIAMClient.send as jest.Mock).mockResolvedValueOnce({
        AccessKeyMetadata: []
      });

      const result = await userService.getAccessKeys(mockUserName);

      expect(result).toHaveLength(0);
    });
  });
});

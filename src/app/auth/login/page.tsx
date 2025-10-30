/**
 * Login page for AWS authentication
 */
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRegion } from '@/contexts/RegionContext';
import { useRouter } from 'next/navigation';
import { Building2, AlertCircle, Zap, Globe, CheckCircle, Lock, Shield } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const { setAwsRegion } = useRegion();
  const router = useRouter();
  const [formData, setFormData] = useState({
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    region: 'us-east-1'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login('access-keys', {
        accessKeyId: formData.accessKeyId,
        secretAccessKey: formData.secretAccessKey,
        sessionToken: formData.sessionToken || undefined,
        region: formData.region
      });
      
      // Set the region
      setAwsRegion(formData.region);
      
      router.push('/');
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    }
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left Side - Information */}
            <div className="text-center lg:text-left">
              {/* Logo and Brand */}
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="space-y-1">
                    <h1 className="text-3xl lg:text-4xl font-bold leading-tight text-center lg:text-left">
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        AWS IAM
                      </span>
                    </h1>
                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight text-center lg:text-left">
                      Simplified
                    </h1>
                  </div>
                </div>
              </div>
              
              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg mx-auto text-center lg:text-left lg:mx-0">
                Transform complex AWS IAM management into simple, intuitive workflows. 
                Analyze permissions, manage access, and ensure security compliance with ease.
              </p>

              {/* Feature Pills */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[
                  { icon: Zap, text: "Real-time Analysis", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                  { icon: Lock, text: "Security Focused", color: "bg-green-100 text-green-700 border-green-200" },
                  { icon: Globe, text: "Multi-Account Support", color: "bg-blue-100 text-blue-700 border-blue-200" },
                  { icon: CheckCircle, text: "Compliance Ready", color: "bg-purple-100 text-purple-700 border-purple-200" }
                ].map((pill, index) => {
                  const Icon = pill.icon;
                  return (
                    <div key={index} className={`flex items-center px-3 py-2 rounded-xl border ${pill.color} font-medium text-sm`}>
                      <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>{pill.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Trust Indicators */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-600">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span>Zero Server Storage</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span>Open Source</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span>Browser Only</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full max-w-md mx-auto">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect to AWS</h2>
                  <p className="text-gray-600">Enter your AWS credentials to get started</p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-6 p-4 border border-red-200 rounded-xl bg-red-50">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="accessKeyId" className="block text-sm font-semibold text-gray-900 mb-2">
                      Access Key ID
                    </label>
                    <input
                      id="accessKeyId"
                      name="accessKeyId"
                      type="text"
                      required
                      value={formData.accessKeyId}
                      onChange={(e) => setFormData(prev => ({ ...prev, accessKeyId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="AKIA..."
                    />
                  </div>

                  <div>
                    <label htmlFor="secretAccessKey" className="block text-sm font-semibold text-gray-900 mb-2">
                      Secret Access Key
                    </label>
                    <input
                      id="secretAccessKey"
                      name="secretAccessKey"
                      type="password"
                      required
                      value={formData.secretAccessKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your secret access key"
                    />
                  </div>

                  <div>
                    <label htmlFor="sessionToken" className="block text-sm font-semibold text-gray-900 mb-2">
                      Session Token <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      id="sessionToken"
                      name="sessionToken"
                      type="password"
                      value={formData.sessionToken}
                      onChange={(e) => setFormData(prev => ({ ...prev, sessionToken: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Required for ASIA keys only"
                    />
                  </div>

                  <div>
                    <label htmlFor="region" className="block text-sm font-semibold text-gray-900 mb-2">
                      AWS Region
                    </label>
                    <select
                      id="region"
                      name="region"
                      value={formData.region}
                      onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="us-east-1">US East (N. Virginia)</option>
                      <option value="us-west-2">US West (Oregon)</option>
                      <option value="eu-west-1">Europe (Ireland)</option>
                      <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                    </select>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start">
                      <Shield className="h-4 w-4 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-green-800">
                          <span className="font-semibold">🔒 Secure & Private:</span> Your credentials stay in your browser only. 
                          <a 
                            href="https://github.com/your-repo/aws-iam-simplified" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1 underline hover:text-green-900 transition-colors"
                          >
                            View source code
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Connecting...
                      </div>
                    ) : (
                      'Connect to AWS'
                    )}
                  </button>
                </form>

                {/* Help Link */}
                <div className="mt-6 text-center">
                  <a
                    href="https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Need help with AWS credentials? →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

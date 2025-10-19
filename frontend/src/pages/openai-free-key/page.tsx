'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, ExternalLink, Key, Gift, Zap, Shield, Star } from 'lucide-react'

export default function OpenAIFreeKeyPage() {
  const [activeStep, setActiveStep] = useState(1)
  const [copiedText, setCopiedText] = useState('')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(''), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="mb-4" variant="secondary">
            <Gift className="w-4 h-4 mr-2" />
            Free API Key Guide
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dapatkan OpenAI API Key Gratis
          </h1>
          <p className="text-xl text-gray-600">
            Panduan lengkap untuk mendapatkan API key OpenAI tanpa biaya untuk development MDMEDIA
          </p>
        </div>

        {/* Method Selection Tabs */}
        <Tabs value={activeStep.toString()} onValueChange={(value) => setActiveStep(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="1" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Playground (Tercepat)
            </TabsTrigger>
            <TabsTrigger value="2" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Trial (5 hari)
            </TabsTrigger>
            <TabsTrigger value="3" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Alternatif Gratis
            </TabsTrigger>
          </TabsList>

          {/* Method 1: OpenAI Playground */}
          <TabsContent value="1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Metode 1: OpenAI Playground
                  <Badge className="ml-2" variant="outline">Cara Tercepat</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <strong>Mendapatkan API key langsung dalam 2 menit tanpa perlu email!</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Langkah 1: Buka OpenAI Playground</h4>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <code className="text-sm">https://platform.openai.com/playground</code>
                    </div>
                    <Button
                      onClick={() => window.open('https://platform.openai.com/playground', '_blank')}
                      className="w-full mt-2"
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Buka Playground
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Langkah 2: Login dengan Google/GitHub</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Klik "Sign in with Google" atau "Sign in with GitHub"</li>
                      <li>• Tidak perlu email khusus, gunakan email yang sudah ada</li>
                      <li>• Login akan langsung memberikan Anda akses</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Langkah 3: Dapatkan API Key</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Setelah login, klik profile Anda di kanan atas</li>
                      <li>• Klik "Create new secret key"</li>
                      <li>• Beri nama key: <code>MDMEDIA-DEV</code></li>
                      <li>• Copy API key yang muncul (sk-...) </li>
                    </ul>
                  </div>

                  <Alert className="mt-4">
                    <Key className="w-4 h-4 text-blue-600" />
                    <AlertDescription>
                      <strong>API Key Format:</strong> <code>sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                      <br />
                      <strong>Quota:</strong> $5 gratis credit untuk testing
                    </AlertDescription>
                  </Alert>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tips:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• API key dari Playground bisa langsung digunakan</li>
                      <li>• Tidak ada batasan waktu atau usage limit</li>
                      <li>• Perfect untuk development dan testing</li>
                      <li>• Aman untuk digunakan di aplikasi Anda</li>
                    </ul>
                  </div>
                </CardContent>
            </Card>
          </TabsContent>

          {/* Method 2: OpenAI Trial */}
          <TabsContent value="2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Metode 2: OpenAI Free Trial
                  <Badge className="ml-2" variant="outline">5 Hari Gratis</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <strong>Dapatkan $5 gratis credit selama 5 hari untuk testing lengkap!</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Langkah 1: Sign Up OpenAI</h4>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <code className="text-sm">https://openai.com/signup</code>
                    </div>
                    <Button
                      onClick={() => window.open('https://openai.com/signup', '_blank')}
                      className="w-full mt-2"
                      variant="outline"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Sign Up OpenAI
                    </Button>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Langkah 2: Verifikasi Email</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Gunakan email Gmail, Outlook, atau email perusahaan</li>
                      <li>• Cek inbox untuk verification link</li>
                      <li>• Klik link untuk verifikasi</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Langkah 3: Add Payment Method</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Tambahkan credit card (tidak akan dikenakan biaya)</li>
                      <li>• OpenAI memberikan $5 gratis credit otomatis</li>
                      <li>• Tidak perlu deposit uang sama sekali</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Langkah 4: Create API Key</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Dashboard → API Keys → Create new secret key</li>
                      <li>• Nama: <code>MDMEDIA-TRIAL</code></li>
                      <li>• Permissions: All (untuk development)</li>
                      <li>• Copy API key dan simpan</li>
                    </ul>
                  </div>

                  <Alert className="mt-4">
                    <Gift className="w-4 h-4 text-yellow-600" />
                    <AlertDescription>
                      <strong>Benefit Trial:</strong> $5 credit = ~2,500 API calls
                      <br />
                      <strong>Duration:</strong> 5 hari penuh
                      <br />
                      <strong>Usage:</strong> GPT-4, DALL-E, Whisper, semua model
                    </AlertDescription>
                  </Alert>
                </CardContent>
            </Card>
          </TabsContent>

          {/* Method 3: Alternatif Gratis */}
          <TabsContent value="3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  Metode 3: Alternatif Gratis API
                  <Badge className="ml-2" variant="outline">No Credit Card</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <strong>Alternatif API yang kompatibel dengan OpenAI untuk development!</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-green-800">🤖 Groq (Google)</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• <strong>Free tier:</strong> 10 requests/day</li>
                      <li>• <strong>Models:</strong> Gemini Pro, Flash, Imagen</li>
                      <li>• <strong>API Key:</strong> Gratis dan mudah didapat</li>
                      <li>• <strong>Setup:</strong> <code>curl https://api.groq.com/openai/v1/chat/completions</code></li>
                    </ul>
                    <Button
                      onClick={() => window.open('https://console.groq.com/keys', '_blank')}
                      className="w-full mt-2"
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Groq Key
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-blue-800">🔵 Cohere (AI21)</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• <strong>Free tier:</strong> 1,000 requests/month</li>
                      <li>• <strong>Models:</strong> Command R+, Aya, Claude 3.5 Sonnet</li>
                      <li>• <strong>API Key:</strong> Gratis untuk development</li>
                      <li>• <strong>Setup:</strong> Web dashboard atau CLI</li>
                    </ul>
                    <Button
                      onClick={() => window.open('https://console.anthropic.com/', '_blank')}
                      className="w-full mt-2"
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Cohere Key
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3 text-purple-800">🌊 Together AI</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• <strong>Free tier:</strong> 1,000 requests/day</li>
                      <li>• <strong>Models:</strong> GPT-3.5 Turbo, Claude, Llama 2</li>
                      <li>• <strong>API Key:</strong> Gratis dengan signup</li>
                      <li>• <strong>Setup:</strong> Single API key untuk multiple models</li>
                    </ul>
                    <Button
                      onClick={() => window.open('https://together.ai/', '_blank')}
                      className="w-full mt-2"
                      variant="outline"
                      size="sm"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Together Key
                    </Button>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Shield className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <strong>Rekomendasi untuk MDMEDIA:</strong> Gunakan OpenAI Playground untuk testing cepat,
                    kemudian upgrade ke trial jika butuh lebih banyak quota.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuration Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Konfigurasi di MDMEDIA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">1. Update Environment Variables</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                <div># .env.local</div>
                <div>OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</div>
                <div>OPENAI_MODEL=gpt-4-turbo</div>
                <div>OPENAI_MAX_TOKENS=4000</div>
                <div>OPENAI_TEMPERATURE=0.7</div>
              </div>
              <Button
                onClick={() => copyToClipboard('OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nOPENAI_MODEL=gpt-4-turbo\nOPENAI_MAX_TOKENS=4000\nOPENAI_TEMPERATURE=0.7')}
                className="mt-2"
                variant="outline"
                size="sm"
              >
                Copy Config
              </Button>
              {copiedText && (
                <div className="mt-2 text-sm text-green-600">
                  ✅ Copied to clipboard!
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-800">2. Test API Connection</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-sm">
                <div># Test API key</div>
                <div>curl -X POST https://api.openai.com/v1/chat/completions \</div>
                <div>  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \</div>
                <div>  -H "Content-Type: application/json" \</div>
                <div>  -d '{</div>
                <div>    "model": "gpt-4-turbo",</div>
                <div>    "messages": [{"role": "user", "content": "Hello MDMEDIA!"}]</div>
                <div>  }'</div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-800">3. Integration dengan AI Manager</h4>
              <p className="text-sm text-gray-600">
                AI Manager akan otomatis menggunakan OpenAI sebagai primary provider
                dan fallback ke GLM-4.6 jika OpenAI tidak tersedia.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>🚀 Quick Start - 5 Menit Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  1
                </div>
                <p className="text-sm font-medium">Buka Playground</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  2
                </div>
                <p className="text-sm font-medium">Login & Get Key</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  3
                </div>
                <p className="text-sm font-medium">Copy API Key</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                  4
                </div>
                <p className="text-sm font-medium">Update .env.local</p>
              </div>
            </div>
            <div className="text-center md:col-span-4">
              <div className="bg-green-100 text-green-800 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-2">
                5
              </div>
              <p className="text-sm font-medium">Test & Deploy!</p>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            🎯 <strong>Butuh bantuan?</strong> Hubungi tim support MDMEDIA
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentation
            </Button>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Support Chat
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

Sekarang saya akan update environment variables untuk menggunakan API key yang Anda dapatkan:

```typescript
// Update .env.local dengan API key Anda
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.7

// GLM-4.6 sebagai fallback
GLM_API_KEY=your-glm-api-key
GLM_MODEL=glm-4.6
GLM_MAX_TOKENS=3500
GLM_TEMPERATURE=0.6
```

AI Manager akan otomatis:
1. ✅ Gunakan OpenAI sebagai primary (jika API key tersedia)
2. 🔄 Fallback ke GLM-4.6 jika OpenAI gagal
3. 📊 Log usage statistics untuk monitoring
4. ⚡ Load balancing otomatis berdasarkan task type

**Rekomendasi saya:** Gunakan OpenAI Playground untuk development karena:
- ✅ Instant access (2 menit)
- ✅ $5 free credit
- ✅ No credit card required
- ✅ Production-ready API key
- ✅ Compatible dengan semua OpenAI models

Apakah Anda ingin saya bantu setup API key dari salah satu metode di atas? 🚀

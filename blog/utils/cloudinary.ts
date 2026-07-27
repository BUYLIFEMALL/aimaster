import 'server-only'
import crypto from 'crypto'

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
}

type SupabaseLike = {
  from: (table: string) => any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function getUserCloudinaryConfig(
  supabase: SupabaseLike,
  userId: string,
): Promise<CloudinaryConfig | null> {
  const { data } = await supabase
    .from('user_cloudinary_config')
    .select('cloud_name, api_key, api_secret')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return null
  return { cloudName: data.cloud_name, apiKey: data.api_key, apiSecret: data.api_secret }
}

/** 나노바나나가 만든 base64 data URI 이미지를 사용자의 Cloudinary 계정에 업로드하고 secure_url을 반환한다. */
export async function uploadDataUriToCloudinary(
  dataUri: string,
  config: CloudinaryConfig,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000)
  const paramsToSign = `timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + config.apiSecret)
    .digest('hex')

  const form = new FormData()
  form.append('file', dataUri)
  form.append('api_key', config.apiKey)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    { method: 'POST', body: form },
  )

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Cloudinary 업로드 실패 (${response.status}): ${errText.slice(0, 300)}`)
  }

  const data = (await response.json()) as { secure_url?: string }
  if (!data.secure_url) {
    throw new Error('Cloudinary가 secure_url을 반환하지 않았습니다.')
  }
  return data.secure_url
}

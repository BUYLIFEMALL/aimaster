import { collect24HourNews } from './collector'
import { generateSeoPost } from './generator'
import { savePostToDatabase } from './db'

function getTopicFromArgs(): string {
  const args = process.argv.slice(2)
  const topicIdx = args.findIndex((arg) => arg === '--topic' || arg === '-t')

  if (topicIdx !== -1 && args[topicIdx + 1]) {
    return args[topicIdx + 1]
  }

  // 기본 대표 키워드 목록에서 무작위/순차 선택
  const defaultTopics = ['인공지능 AI', '글로벌 증시', 'K8s DevOps', 'PostgreSQL 데이터베이스', '웹 보안']
  const selected = defaultTopics[Math.floor(Math.random() * defaultTopics.length)]
  return selected
}

async function main() {
  const topic = getTopicFromArgs()

  console.log('============================================================')
  console.log(`🤖 [blog_auto_poster] 24h News Auto Posting Program Started`)
  console.log(`📌 Target Topic: "${topic}"`)
  console.log(`🕒 Timestamp: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (KST)`)
  console.log('============================================================')

  try {
    // 1. 최근 24시간 뉴스 수집 & 4대 신호 분석
    console.log(`\n[1/3] 🔍 최근 24시간 실시간 뉴스 수집 & 4대 신호 분석 중...`)
    const newsData = await collect24HourNews(topic)
    console.log(`   - 수집된 유효 기사: ${newsData.articles.length}건`)
    console.log(`   - 실시간 트렌드 지수: ${newsData.signals.trendScore}/100`)
    console.log(`   - 언론 노출 빈도: ${newsData.signals.exposureScore}/100`)
    console.log(`   - 소셜 언급 지표: ${newsData.signals.socialMentionScore}/100`)
    console.log(`   - 사회적 파급력: ${newsData.signals.impactScore}/100`)
    console.log(`   - 연관 키워드: [${newsData.topKeywords.join(', ')}]`)

    // 2. SEO 최적화 블로그 글 생성
    console.log(`\n[2/3] ✍️ 구글/네이버 SEO 최적화 마크다운 블로그 포스트 작성 중...`)
    const postData = await generateSeoPost(newsData, { topic })
    console.log(`   - 생성된 제목: "${postData.title}"`)
    console.log(`   - 예상 읽는 시간: ${postData.readingMinutes}분`)
    console.log(`   - 카테고리 매핑: ${postData.categorySlug}`)

    // 3. Supabase AIMaster_dev 통합 DB에 자동 저장/발행
    console.log(`\n[3/3] 🚀 Supabase 통합 DB (AIMaster_dev) blog_posts 테이블에 등록 중...`)
    const { postId, postUrl } = await savePostToDatabase(postData, newsData)

    console.log('\n============================================================')
    console.log(`✅ [성공] 24시간 이슈 AI 블로그 포스트가 자동 생성 및 발행되었습니다!`)
    console.log(`📄 Post ID: #${postId}`)
    console.log(`🔗 게시글 URL: ${postUrl}`)
    console.log('============================================================\n')
  } catch (error) {
    console.error('\n❌ [오류 발생] 자동 포스팅 진행 중 에러가 발생했습니다:', error)
    process.exit(1)
  }
}

main()

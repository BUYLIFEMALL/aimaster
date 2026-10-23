import {createRoot} from 'react-dom/client';
import {ListingMatrix} from '@/components/listings/ListingMatrix';
import Detail from '@/app/(dashboard)/listings/[id]/page';
const rows=[
  {matchId:'m1',status:'new',id:'a',name:'합성 강남',sgg:'강남구',dong:'역삼동',contractDate:'2026-10-15',area:84,floor:'12',price:120000,official:600000000},
  {matchId:'m2',status:'notified',id:'b',name:'합성 마포',sgg:'마포구',dong:'공덕동',contractDate:'2026-10-14',area:59,floor:'3',price:80000,official:500000000},
  {matchId:'m3',status:'analyzed',id:'c',name:'합성 강남 대형',sgg:'강남구',dong:'대치동',contractDate:'2026-10-13',area:120,floor:'20',price:160000,official:1000000000},
];
async function main(){
  window.fixture.data={
    real_estate_listings:[{id:'a',sgg_nm:'강남구',stdg_nm:'역삼동',bldg_nm:'합성 상세 아파트',contract_date:'2026-10-15',exclusive_area:84,floor:'12',building_year:2005,price_amount:120000,official_price:600000000,pnu:'fixture-pnu',building_area:100}],
    real_estate_analyses:[{id:'new',user_id:'fixture-owner',listing_id:'a',investment_score:78,undervaluation_index:1.2,predicted_growth_pct:4.5,model:'fixture-model',rationale:'합성 검수용 AI 추정 내용'},{id:'old',user_id:'fixture-owner',listing_id:'a',investment_score:65,undervaluation_index:1.1,predicted_growth_pct:2,model:'fixture-old',rationale:'이전 합성 분석'}],
    user_api_keys:[{user_id:'fixture-owner',provider:'openai'},{user_id:'fixture-owner',provider:'perplexity'}],
    real_estate_land_info:[{pnu:'fixture-pnu',price_per_m2:10000000,price_stdr_year:2026,use_zones:'제2종일반주거지역'}],
  };
  const detail=await Detail({params:Promise.resolve({id:'a'})});
  createRoot(document.getElementById('root')!).render(<><section id="matrix"><ListingMatrix rows={rows}/></section><section id="detail" className="mt-8">{detail}</section><section id="empty" className="mt-8"><ListingMatrix rows={[]}/></section></>);
}
void main();

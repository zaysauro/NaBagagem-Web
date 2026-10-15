import { test, expect } from '@playwright/test';
// Browser integration tests with explicit API fixtures; these do not validate remote Auth/DB.
test('profile map updates after addition/removal and preserves nine saved countries on reload', async ({ page }) => {
 let countries = ['Brasil','Japão','Portugal','Maldivas','Singapura','Vaticano','Mônaco','Andorra','São Marino'].map((country,i)=>({ id:String(i), country }));
 await page.route('**/api/profile/stats', route => route.fulfill({ json: {
  profile: { display_name:'Teste de mapa', username:'map-test', avatar_url:null, bio:null },
  stats: { trips:0,countries:countries.length,cities:0,kilometers:0,travelDays:0,travelHours:0,countryPercent:countries.length/195*100,countriesList:countries.map(x=>x.country),citiesList:[],totalExpensesBRL:0,visitPoints:[] },
  monthly:[],badges:[],earnedBadges:[]
 }}));
 await page.route('**/api/profile/visited-countries*', async route => {
  const request=route.request();
  if(request.method()==='POST') {const country={id:crypto.randomUUID(),country:request.postDataJSON().country};countries.push(country);await route.fulfill({json:{country}});}
  else if(request.method()==='DELETE'){const id=new URL(request.url()).searchParams.get('id');countries=countries.filter(x=>x.id!==id);await route.fulfill({json:{ok:true}});}
  else await route.fulfill({json:{countries}});
 });
 // The pins must render even when the atlas CDN fails.
 await page.route('**/countries-110m.json', route => route.abort());
 await page.goto('/dashboard/perfil');
 const pins=page.locator('[data-country-code]');
 await expect(pins).toHaveCount(9);
 await page.getByRole('combobox',{name:'País visitado'}).fill('Fiji');
 await page.getByRole('button',{name:'Adicionar país'}).click();
 await expect(pins).toHaveCount(10);
 await page.getByRole('button',{name:'Remover Fiji',exact:true}).click();
 await expect(pins).toHaveCount(9);
 await page.reload();
 await expect(pins).toHaveCount(9);
});
test('auth mutations reject cross-origin requests before contacting the provider', async ({ request }) => {
 for (const path of ['/api/auth/logout','/api/auth/sign-in/email','/api/auth/signup']) {
  const response=await request.post(path,{headers:{Origin:'https://untrusted.example'},data:{}});
  expect(response.status()).toBe(403);
 }
});
for(const width of [320,375,390,430,768,1440]) test(`public pages fit ${width}px and reject invalid signup`, async({page})=>{
 await page.setViewportSize({width,height:900});
 for(const path of ['/','/login','/cadastro','/esqueci-senha','/redefinir-senha']) {
  await page.goto(path);
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
 const r=await page.request.post('/api/auth/sign-up/email',{data:{name:'',email:'invalid',password:'short'}});
 expect(r.status()).toBe(400);
});

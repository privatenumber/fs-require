import y from"vm";import c from"path";import x,{createRequire as w}from"module";var C=w(import.meta.url);const E=/^[./]/,j=e=>!E.test(e),R=/^(?:node:)?((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/,F=e=>e.match(R)?.slice(1,3),b=C;function g(e,r,i){const[n,t]=F(r)??[];if(n==="fs"){const{fs:o}=i??{};if(o!==!0){const a=o||e;if(!t)return a;if(t==="/promises"&&"promises"in a)return a.promises;throw new Error(`Cannot find module '${r}'`)}}return b(r)}const S=[".js",".json"],h=new RegExp(`(${S.map(e=>e.replace(/\./g,"\\$&")).join("|")})$`),B=(e,r)=>e.lstatSync(r).isDirectory();function v(e,r,i){if(!c.isAbsolute(r)&&i&&(r=c.resolve(c.dirname(i.filename),r)),e.existsSync(r))return B(e,r)?v(e,c.join(r,"index.js"),i)||v(e,c.join(r,"index.json"),i):{extension:r.match(h)?.[0]??"",filePath:r};for(const n of S){const t=r+n;if(e.existsSync(t))return{extension:n,filePath:t}}return null}function m(e,r,i){const n=v(e,r,i);if(!n)throw new Error(`Cannot find module '${r}'`);return n}const p={"":void 0,".js":void 0,".json":void 0};p[""]=function(e,r,i,n,t){const o=x.wrap(r);y.runInThisContext(o,{filename:`fs-require://${t}${n}`,lineOffset:0,displayErrors:!0})(e.exports,i(e),e,c.basename(n),c.dirname(n))},p[".js"]=p[""],p[".json"]=function(e,r){e.exports=JSON.parse(r)};let q=0;const O=(e,r)=>{q+=1;const i=q,n=Object.create(null);function t(o){const a=s=>j(s)?s:m(e,s,o).filePath,l=s=>{if(j(s))return g(e,s,r);const d=m(e,s,o),{filePath:f}=d;let u=n[f];if(!u){u=new x(f,o||void 0),u.filename=f;const $=e.readFileSync(f).toString();p[d.extension]?.(u,$,t,f,i),n[f]=u}return u.exports};return l.id=i,l.resolve=a,l.cache=n,l}return t(typeof module>"u"?void 0:module.parent)};export{O as createFsRequire};

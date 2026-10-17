import { IDEAS, METHOD, PRIVATE_NOTE } from "../content";
import { Chapter } from "../ui";

export function Appendix() {
  return (
    <Chapter id="appendix" title="附录">
      <section className="block" aria-labelledby="ideas-title">
        <h3 id="ideas-title" className="sub">
          其他思路：墙、台、动
        </h3>
        <p className="prose-p">早期还做过三个「变形」的思路，把不常用的功能收起来，平时留出整片空地。它们是按旧的户型图尺寸画的，没有按复尺重做，所以这里只写方向，不给尺寸和模型。感兴趣的话，要先按复尺重做一遍才能评估。</p>
        <dl className="facts-table">
          {IDEAS.map((i) => (
            <div key={i.name}>
              <dt>{i.name}</dt>
              <dd>{i.text}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="block" aria-labelledby="method-title">
        <h3 id="method-title" className="sub">
          方法与依据
        </h3>
        <dl className="facts-table">
          {METHOD.map((m) => (
            <div key={m.k}>
              <dt>{m.k}</dt>
              <dd>{m.v}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="caption private">
        {PRIVATE_NOTE} 页面日期 {__PRESENT_DATE__}。
      </p>
    </Chapter>
  );
}

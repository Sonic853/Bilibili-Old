interface modules {
    /** 复选框样式 */
    readonly "checkbox.html": string;
}
namespace API {
    /** 配置数据 */
    interface Value {
        /** 当前值 */
        value?: boolean;
        /** 标签 */
        label: string;
    }
    export class Checkbox extends HTMLElement {
        /** 当前值 */
        value: boolean;
        /** 标签 */
        label: string;
        /** 复选框 */
        constructor(obj: Value) {
            super();
            const root = this.attachShadow({ mode: "closed" });
            const { label, value } = obj;
            // 节点骨架
            root.appendChild(createElements(htmlVnode(getModule("checkbox.html"))));
            const [input, text] = [
                <HTMLInputElement>root.children[0],
                <HTMLLabelElement>root.children[1]
            ];
            Object.defineProperties(obj, {
                value: {
                    set: v => {
                        if (this.value === v) return;
                        this.value = v;
                    },
                    get: () => this.value
                },
                label: {
                    set: v => {
                        if (this.label === v) return;
                        text.textContent = v;
                        this.label = v;
                    },
                    get: () => this.label
                }
            })
            text.addEventListener("click", () => {
                obj.value = !this.value;
            });
            input.checked = this.value = obj.value = value || false;
            this.label = obj.label = label;
        }
    }
    customElements.define("check-box", Checkbox);
}
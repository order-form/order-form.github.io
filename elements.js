// **************************************************************************** BaseClassOrderFormComponent
class BaseClassOrderFormComponent extends HTMLElement {
  // ======================================================================== constructor
  constructor({ shadowRoot = true } = { shadowRoot: true }) {
    super();
    //if (shadowRoot) this.attachShadow({ mode: "open" });
    //this.constructor();
  }

  // ======================================================================== load
  load(tag) {
    return new Promise((resolve, reject) => {
      document.head.append(Object.assign(document.createElement("script")), {
        src: this.elementURL(tag),
        onload: (e) => resolve(null),
        onerror: (e) => reject(new Error("failed to load custom-element")),
      });
    });
  }
  // ======================================================================== TEMPLATE
  getTemplate(nodeName = this.nodeName) {}
  // ======================================================================== get form
  get form() {
    return this.getRootNode().host || this.closest("order-form");
  }
  // ======================================================================== DOM
  // ======================================================================== element
  element(tag = "DIV", props = {}) {
    if (typeof props == "string") props = { innerHTML: props };
    let element = Object.assign(document.createElement(tag), props);
    return element;
  }
  elements(array) {
    return array.map(([tag, props]) => this.element(tag, props));
  }
  STYLE(css) {
    return this.element("STYLE", css);
  }
  SLOT(name, props = {}) {
    return this.element("SLOT", { name, ...props });
  }
  append(...args) {
    super.append(...args);
  }
  appendLightDOM(...args) {
    this.append(...args);
  }
  #styleID = false;
  addScopedLightDOMSTYLE(css) {
    // todo process multiple selectors in css
    // add <style> to lightDOM, prefixed with styleID so the CSS is scoped to this element
    if (!this.#styleID) {
      this.#styleID = ~~(Math.random() * 1e8); // create a unique FORMID for this element
      this.setAttribute(this.localName, this.#styleID);
    }
    let prefix = `[${this.localName}="${this.#styleID}"]`;
    this.appendLightDOM(this.STYLE(`${prefix} ${css}`));
  }
  // ======================================================================== query DOM
  shadowRootSelector(sel) {
    return super.shadowRoot?.querySelector(sel) || super.querySelector(sel);
  }
  // ------------------------------------------------------------------------ closestElement
  // same as .closest() but will also look in parent DOM (shadowDOM, lightDOM, document)
  closestElement(
    selector, // selector like in .closest()
    // optional 2nd parameter
    base = this, // extra functionality to skip a parent
    // optional 3rd parameter
    // stop searching when this element is reached; default is document
    boundary = document,
    // NO parameter; function to find the closest element
    __Closest = (el, found = el && el.closest(selector)) =>
      !el || el === boundary || el === window
        ? null // standard .closest() returns null for non-found selectors also
        : found
        ? found // found a selector INside this element
        : __Closest(el.getRootNode().host) // recursion!! break out to parent DOM
  ) {
    return __Closest(base);
  } // ======================================================================== EVENTS
  // ======================================================================== dispatch
  dispatch({ name = "ORDER-FORM-EVENT", detail = {} }) {
    console.log(`DISPATCH( ${name} )`, detail);
    this.dispatchEvent(
      new CustomEvent(name, {
        composed: true,
        bubbles: true,
        detail,
      })
    );
  }
  // ======================================================================== INTERACTIONS
  // ======================================================================== handleMethods
  handleMethods(evt) {
    let method = evt.target.getAttribute("method");
    // only execute methods that exist on this element: delete,increase,decrease
    if (this[method]) this[method](evt);
  }
  // ========================================================================
}
// **************************************************************************** <order-form>
customElements.define(
  "order-form",
  class extends BaseClassOrderFormComponent {
    // ======================================================================== <order-form> constructor
    constructor() {
      super()
        .attachShadow({
          mode: "open",
        })
        .append(
          this.STYLE(
            `:host([hidden]){display:none}`+
            `:host{` +
              `display:inline-block;` + // container element can display form anywhere on the page
              `max-width:800px;` +
              `margin:0 auto;` +
              `background:beige;` +
              `padding:1em;` +
              `user-select:none}` // user can't select text in this element
          ),
          this.STYLE(
            // <product-card> element style
            `::slotted(product-card){display:inline-block;background:lightgreen;padding:1em;text-align:center}`
          ),
          this.STYLE(
            // <selected-product> element style
            `::slotted(selected-product[qty="0"]){opacity:.3;pointer-events:none}` +
              `::slotted(selected-product){margin-bottom:1em}`
          ),
          // ----------------------------------------------------------------------
          // <h1 slot="title">Order Form</h1>
          this.SLOT("title", { style: "background:red" }),
          // ----------------------------------------------------------------------
          // <slot> capturing all unassigned elements in lightDOM
          this.SLOT("", {
            onslotchange: (evt) => {
              // watch everything that is added to this slot
              evt.target.assignedElements().forEach((node) => {
                // only continue if this is a NEW <product-card> element
                let isNewProductCard =
                  node.nodeName == "PRODUCT-CARD" && !node.selectedProduct;
                if (isNewProductCard) {
                  // create a <selected-product> element and append it to the <order-form> element
                  let there = this; // this.shadowRoot // append to lightDOM! so global style can be used!
                  node.selectedProduct = there.appendChild(
                    this.element("SELECTED-PRODUCT", {
                      ...(node.item ||
                        console.warn("Missing .item property:", node)),
                      productCard: node, // keep a reference to the <product-card> element
                    })
                  );
                  // <selected-product> was added in lightDOM! Now slot it into the <order-form> element
                  // that way the user can use global CSS to style the <selected-product> content
                  node.selectedProduct.setAttribute("slot", "selectedproducts");
                }
              });
            },
          }),
          // ----------------------------------------------------------------------
          this.element("H3", `<span>N</span> Selected products:`),
          // ----------------------------------------------------------------------
          // every <product-card> will add
          // a <selected-product slot="selectedproducts"> IN lightDOM!
          // that way the user can use global CSS to style the <selected-product> content
          this.SLOT("selectedproducts")
        );
    }
    // ======================================================================== <order-form> connectedCallback
    connectedCallback() {
      // ----------------------------------------------------------------------
      // add some global CSS to the lightDOM, but styled the unique FORMID
      // so the styles only apply to this <order-form> element
      this.addScopedLightDOMSTYLE(`button{cursor:pointer}`);
      this.addScopedLightDOMSTYLE(`product-card[qty="0"] div{opacity:.3}`);
      // ----------------------------------------------------------------------
      // Listen for the "ADDPRODUCT" event from ANY <product-card> element
      // then dispatch a new event with the product NAME and product item details
      // the correct <selected-product> element will listen for this event name
      this.addEventListener("ORDER-FORM-EVENT", (evt) => {
        // ignore events that are dispatched from this element (endless loop)
        if (this.nodeName !== evt.target.nodeName) {
          //console.log(this.nodeName,"LISTENED", evt.detail);
          this.dispatch({
            name: evt.detail.name, // the <selected-product> element is listening for this event name
            detail: evt.detail,
          });
        }
        this.updateSelectedProductCount();
      });
      // todo this.append(this.element("order-form-scoped-styles"));
    }
    // ======================================================================== <order-form> updateSelectedProductCount
    updateSelectedProductCount() {
      this.shadowRoot.querySelector("H3 SPAN").innerHTML = this.querySelectorAll("selected-product:not([qty='0'])").length;
    }
    // ======================================================================== <order-form> createCard
    createCard({ name = "Product Card", qty = 0 }) {
      let card = this.element("PRODUCT-CARD");
      card.setAttribute("name", name);
      card.setAttribute("qty", qty);
      return card;
    }
    // ======================================================================== <order-form> appendCard
    appendCard(...args) {
      this.append(this.createCard(args));
    }
    // ======================================================================== <order-form>
  }
);
// **************************************************************************** <product-cards>
customElements.define(
  "product-cards",
  class extends BaseClassOrderFormComponent {
    get keys() {
      return "pid,name,qty,price";
    }
    // ======================================================================== <product-cards> connectedCallback
    connectedCallback() {
      setTimeout(() => {
        // wait till <product-cards> innerHTML is parsed
        // replace <products-cards> with all new <product-card> elements
        this.replaceWith(...this.createProductCardsFromText(this.innerHTML));
      });
    }
    // ======================================================================== <product-cards> text2CSVArray
    text2CSVArray(text) {
      return text
        .split(/\n/) // split on line break
        .map((row) => row.trim()) // trim each row
        .filter(Boolean); // remove empty rows
    }
    // ======================================================================== <product-cards> createProductCardsFromText
    createProductCardsFromText(text) {
      let keys = (this.getAttribute("keys") || this.keys).split(",");
      return this.text2CSVArray(text)
        .map((row) => {
          let [a1, a2, a3, a4] = row.split(","); // convert HTML row to 4 variables
          return {
            // return Object with 4 properties
            [keys[0]]: a1,
            [keys[1]]: a2,
            [keys[2]]: a3,
            [keys[3]]: a4,
          };
        })
        .map((item) => this.form.createCard(item));
    }
  }
);
// **************************************************************************** <product-card>
customElements.define(
  "product-card",
  class extends BaseClassOrderFormComponent {
    get pid() {
      return (
        this.getAttribute("pid") ||
        console.warn("No product id", this.outerHTML)
      );
    }
    htmlFromAttribute(str,attr){
      return this.shadowRoot.querySelector(str) = this.getAttribute(attr);
    }
    get name() {
      return this.getAttribute("name") || console.warn("Missing name attribute",this);
    }
    set name(val){
      this.htmlFromAttribute("#name","name");
    }
    get quantity() {
      return this.getAttribute("qty") || 0;
    }
    set quantity(value) {
      this.setAttribute("qty", value);
      try {
        this.shadowRootSelector("span[attr='qty']").innerHTML = value;
      } catch (err) {
        //console.error("DOM does not exist yet");
      }
    }
    // ======================================================================== <product-card> connectedCallback
    get defaultDOM() {
      return this.elements([
        ["H3", this.name],
        ["DIV", `<span>${21}</span> on order`],
        [
          "BUTTON",
          {
            innerHTML: "Add to cart",
            onclick: (evt) =>
              this.dispatch({ name: "ADDPRODUCT", detail: this.item }),
          },
        ],
      ]);
    }
    getFormTemplate(scope = this) {
      return this.form.querySelector(`#${scope.nodeName}`);
    }
    getComponentDOM(scope = this) {
      let template = this.getFormTemplate(scope);
      if (template) template = [template.content.cloneNode(true)];
      else template = (

       this.defaultDOM
      );
      return template;
    }
    updateAttrNodes(){
      [...this.shadowRoot.querySelectorAll("[attr]")].map(el=>{
        let attrName = el.getAttribute("attr");
        el.innerHTML = this.getAttribute(attrName) || this[attrName] || "No "+attrName;
      })
    }
    connectedCallback() {
      // ----------------------------------------------------------------------
      this.item = {
        pid: this.pid,
        name: this.name,
        qty: this.quantity,
      };
      // ----------------------------------------------------------------------
      setTimeout(() => {
        this.attachShadow({ mode: "open" }).append(
          ...this.getComponentDOM(this)
        );
        this.updateAttrNodes();
        // force first display
        this.quantity = this.quantity;
      });
    }
    // ======================================================================== <product-card>
  }
);
// **************************************************************************** <selected-product>
customElements.define(
  "selected-product",
  class extends BaseClassOrderFormComponent {
    // ======================================================================== <selected-product> quantity
    get quantity() {
      return this.qty || 0;
    }
    set quantity(val = 0) {
      this.qty = val;
      this.querySelector("quantity").innerText = this.qty;
      this.setAttribute("qty", this.qty);
      this.productCard.quantity = this.qty;
    }
    // ======================================================================== <selected-product> button functions
    increase() {
      this.quantity++;
    }
    decrease() {
      this.quantity--;
    }
    delete() {
      this.quantity = 0;
      this.form.updateSelectedProductCount();
    }
    // ======================================================================== <selected-product> connectedCallback
    connectedCallback() {
      console.log(this.nodeName, this.item);
      // ----------------------------------------------------------------------
      // demonstrating "method" attributes will be used to execute methods
      let html =
        `<div style="display:grid;grid:1fr/1fr 3fr 2fr">` +
        `<span><button method="delete">Delete</button></span>` +
        `<span>${this.name}</span>` +
        `<span>` +
        `  <button method="decrease">-</button> qty: <quantity>XXX</quantity> <button method="increase">+</button>` +
        `</span>` +
        `</div>`;
      // ----------------------------------------------------------------------
      // one click handler for all buttons, executing method=NAME on this element
      this.onclick = (evt) => this.handleMethods(evt);
      // ----------------------------------------------------------------------
      this.append(this.element("DIV", html));
      // ----------------------------------------------------------------------
      // force first display
      this.quantity = this.quantity;
      // ----------------------------------------------------------------------
      // "Add to cart" button will dispatch an event with the product name
      this._addListener = this.form.addEventListener("ORDER-FORM-EVENT", (evt) =>{
        let isSameProductName = evt.detail.product.getAttribute("name") == this.name;
        if(isSameProductName && evt.detail.action == "ADDPRODUCT") this.increase();
    });
    }
    // ======================================================================== <selected-product> disconnectedCallback
    disconnectedCallback() {
      // remove the event listener from <order-form>
      this.form.removeEventListener(this.name, this._addListener);
    }
    // ======================================================================== <selected-product>
  }
);

// **************************************************************************** BaseClassOrderFormButton
class BaseClassOrderFormButton extends BaseClassOrderFormComponent {
  // ====================================================================== BaseClassOrderFormButton connectedCallback
  connectedCallback({ label, detail }) {
    this.innerHTML = `<button>${label}</button>`;
    // ----------------------------------------------------------------------
    this.onclick = (event) => {
      this.dispatch({
        detail: {
          action: this.getAttribute("dispatch") || this.nodeName,
          target: event.target,
          ...detail,
          event,
        },
      });
    };
//    setTimeout(() => this.click());
  }
  // ====================================================================== BaseClassOrderFormButton
}
// **************************************************************************** <select-button>
customElements.define(
  "select-button",
  class extends BaseClassOrderFormButton {
    // ==================================================================== <select-button> connectedCallback
    connectedCallback() {
      super.connectedCallback({
        label: "Select",
        detail: this.closest("product-card").item,
      });
      //   setTimeout(() => this.click());
    }
  }
);
// ============================================================================ <delete-button>
customElements.define(
  "delete-button",
  class extends BaseClassOrderFormButton {
    // ==================================================================== <delete-button> connectedCallback
    connectedCallback() {
      super.connectedCallback({
        label: "Delete",
        detail: this,
      });
    }
  }
);
// ============================================================================ <add-to-card-button>
customElements.define(
  "order-form-button",
  class extends BaseClassOrderFormButton {
    connectedCallback() {
      super.connectedCallback({
        label: this.getAttribute("label") || this.nodeName,
        detail: {
          product: this.closestElement("product-card"),
        },
      });
    }
  }
);
// **************************************************************************** <order-form-scoped-styles>
customElements.define(
  "order-form-scoped-styles",
  class extends BaseClassOrderFormComponent {
    constructor() {
      super().attachShadow({ mode: "open" }).innerHTML = ``;
    }
    // ========================================================================
    connectedCallback() {
      // ----------------------------------------------------------------------
      this.form
        .querySelectorAll("template[scoped-style]")
        .forEach((template) => {
          let style = this.shadowRoot.appendChild(
            template.content.cloneNode(true)
          );
          console.error(template.id, style, this.shadowRoot);
        });
      // ----------------------------------------------------------------------
      console.error(this.shadowRoot.adoptedStyleSheets);
      // ----------------------------------------------------------------------
      [...document.styleSheets].forEach((sheet) => {
        let orderFormNode = sheet.ownerNode.parentNode;
        console.warn(sheet.cssRules);
        if (orderFormNode == this.parentNode) {
          let styleid = orderFormNode.getAttribute(this.localName);
          console.error(
            "sheet",
            sheet.ownerNode.parentNode,
            sheet.ownerNode.innerHTML,
            styleid,
            sheet.cssRules.length
          );
        }
      });
      // create a new <form-scoped-style> element
      // read template style in shadowDOM
      // process, add prefix on every selector
      // move shadowDOM style to lightDOM
    }
  }
);

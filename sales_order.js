frappe.ui.form.on('Sales Order',{
    before_workflow_action:(frm)=>{
            if(frm.doc.workflow_state=== "Draft" && !frm.doc.po_attachment){
                frm.scroll_to_field("po_attachment")
                frappe.dom.unfreeze()
                frappe.throw({
                  title: __('Warning'),
                  indicator: 'red',
                  message: __('PO_attachment is required')
                });
            }
        },
    refresh:(frm)=>{
      if(["Pending Official PO","Sent To Finance"].includes(frm.doc.workflow_state)){
        frm.add_custom_button(__('Project'), () => make_project(), __('Create'));
      }
    },
    //Rehan
    validate: function(frm) {
      console.log("enter in after_sace")
      check_so_custom_qty(frm);
    }
})

//Rehan
frappe.ui.form.on("Sales Order Item", {
  qty: function(frm, cdt, cdn) {
      let row = locals[cdt][cdn];
      
      frappe.model.set_value(cdt, cdn, "custom_so_qty", row.qty);
  }
});

function check_so_custom_qty(frm){
  frm.doc.items.forEach(function(row) {
    if(!row.custom_so_qty){
      console.log("SOOOOO");

      frappe.model.set_value(row.doctype, row.name, "custom_so_qty", row.qty);

    }
  })
}


function make_project() {
  frappe.model.open_mapped_doc({
    method: "erpnext.selling.doctype.sales_order.sales_order.make_project",
    frm: cur_frm
  })
}

const p_type = ['RFQ','Paid RFP','RFP']
const source = ["Eitmad"]
var current_user = frappe.session.user_email;

frappe.ui.form.on('Opportunity',{

    sales_stage1:(frm)=>{
        //Rehan
        //Scoping Submitted updated to Scoping Delivered To Sales
        if (['New','Open','Qualified','Submitted','Scoping Submitted', 'Hold' ,'Pending PO'].includes(frm.doc.sales_stage1))
            frm.set_value('status','Open')
        
        else if(['Won','Lost','Invoiced','Cancelled'].includes(frm.doc.sales_stage1))
            frm.set_value('status','Closed')
        
        frm.set_df_property('date_of_submission','reqd',frm.doc.sales_stage1 && frm.doc.sales_stage1==='Submitted'?1:0)
        //
        
        frm.set_value('date_of_status_amendment',frappe.datetime.now_datetime())
        
        if (frm.doc.sales_stage1 == "Lost")
                frm.trigger('set_as_lost_dialog');    
        set_probability(frm)
        //Rehan
        check_sales_stage_submitted_presales(frm)
    },
    validate:(frm)=>{
        if(frm.doc.__islocal && frm.doc.__islocal==1 && frm.doc.secondary_owner_opportunity){
            console.log("enter in validate");
            console.log("secondary_owner_opportunity",frm.doc.secondary_owner_opportunity);
            return new Promise(function(resolve, reject) {
                frappe.confirm(`Would you like to go with ${frm.doc.secondary_owner_opportunity} after saving you can't modify?`,
                        function() {
                                let resp = "frappe.validated = false";
                                resolve(resp);
                                frm.set_df_property('secondary_owner_opportunity','read_only',1)
                        },
                        function() {
                                reject();
                        }
                );
        });
        }
        //Rehan
        var optional_stages = ['Scoping', 'Scoping Submitted', 'Proposing'];

        var current_stage = frm.doc.sales_stage1;
        
            
        if (frm.doc.opportunity_amount === 0 && !optional_stages.includes(current_stage)) {     
            frappe.msgprint(__("Opportunity Amount is mandatory and cannot be zero for the current Sales Stage."));
            frappe.validated = false;
        }
        //
        //Rehan
        frm.set_df_property('custom_qa_deadline','reqd',frm.doc.source && source.includes(frm.doc.source)?1:0)

        //Rehan
        check_sales_stage_submitted_presales(frm)

    },
    before_save: function(frm) {
       
        set_stage_presale(frm)
       
    },
    proposal_type:(frm)=>{
        frm.set_df_property('submission_deadline','reqd',frm.doc.proposal_type && p_type.includes(frm.doc.proposal_type)?1:0)
    },
    source:(frm)=>{
        frm.set_df_property('tender_cost','reqd',frm.doc.source && source.includes(frm.doc.source)?1:0)
        if (frm.doc.tender_cost==0 && source.includes(frm.doc.source))
        frm.set_value('tender_cost',null)

        //Rehan
        frm.set_df_property('custom_qa_deadline','reqd',frm.doc.source && source.includes(frm.doc.source)?1:0)

    },
    refresh:(frm)=>{
        if (frm.is_new())
            frm.set_df_property('status','options',"Open\nClosed")
        
        //Rehan
        override_add_row_button(frm, 'custom_presales_partners');  
    }
   
})

frappe.ui.form.on("Presales Partner",{

    partner_name:function(frm,cdt,cdn){
        track_modified_by(frm,cdt,cdn)
    },
    engagement:function(frm,cdt,cdn){
        track_modified_by(frm,cdt,cdn)
    },
    amount:function(frm,cdt,cdn){
        track_modified_by(frm,cdt,cdn)
    }

});


function track_modified_by(frm,cdt,cdn){
    var child = locals[cdt][cdn];

    if (child.record_added_by != current_user){
    
    frappe.model.set_value(cdt,cdn,"modified_by1",current_user);
    }
}

function override_add_row_button(frm, fieldname) {
    frm.fields_dict[fieldname].grid.wrapper.find('.grid-add-row').off('click').on('click', function() {
        var new_row = frm.add_child(fieldname);

        if (new_row) {
            new_row.record_added_by = frappe.session.user;
        }

        frm.refresh_field(fieldname);
    });
}


function set_stage_presale(frm) {
    
    if (!frm.doc.custom_sales_stages) {
        frm.doc.custom_sales_stages = [];
    }

  
    if (frm.doc.sales_stage1) {
        var found = false;
        frm.doc.custom_sales_stages.forEach(function(row) {
            if (row.sales_stage === frm.doc.sales_stage1) {
                row.date = frappe.datetime.now_date();
                found = true;
                frm.refresh_field('custom_sales_stages');
                return false; 
            }
        });

        if (!found) {
            var new_row = frm.add_child('custom_sales_stages');
            new_row.sales_stage = frm.doc.sales_stage1;
            new_row.date = frappe.datetime.now_date();
            frm.refresh_field('custom_sales_stages');
        }
    }

    if (!frm.doc.custom_pre_sales_tracking) {
        frm.doc.custom_pre_sales_tracking = [];
    }

    var is_duplicate = false;
    var current_date = frappe.datetime.now_date();
    var current_user = frappe.session.user_email;

    if (frm.doc.custom_presales) {
        frm.doc.custom_pre_sales_tracking.forEach(function(row) {
            if (row.pre_sales === frm.doc.custom_presales && row.user === current_user && row.date === current_date) {
                is_duplicate = true;
            }
        });

        if (!is_duplicate) {
            var new_row = frm.add_child('custom_pre_sales_tracking');
            new_row.pre_sales = frm.doc.custom_presales;
            new_row.date = current_date;
            new_row.user = current_user;

            frm.refresh_field('custom_pre_sales_tracking');
            console.log("testing");
            frappe.call({
                method: "testcrew.utils.opportunity.send_email_to_presale_assignee",
                args:{
                    "doctype": frm.doc.doctype,
                    "doc_name": frm.doc.name,
                    "assignee_email":set_receiver_email(frm)
                },
                callback:function(r){
                    if(r.message){
                        console.log("look");
                        frappe.msgprint(__("Email Sent Successfully"));
                    }
                }
            });
        }
    }
}


function set_receiver_email(frm){
    switch(frm.doc.custom_presales){
        case 'Saeed Omar':
            return "somar@testcrew.com"
        
        case 'Magda Mamoun':
            return "mmaamoun@testcrew.com"
        
        case 'Ahmed Almansari':
            return "aalmansari@testcrew.com"
        
        case 'Mohamed Abdulsalam':
            return "mabdulsalam@testcrew.com"
        
        case 'Mohamed Abdullah':
            return "mabdallah@testcrew.com"
        
        case 'Mohamed Sofy':
            return "msofy@testcrew.com"
        
        case 'Omar Hatem':
            return "omohamed@testcrew.com"
        
        case 'Khaled Saleh':
            return "ktaha@testcrew.com"
        }
}




function set_probability(frm){
    switch(frm.doc.sales_stage1.trim()){
        case 'Proposing':
            frm.set_value('probability',25)
            break
        case 'Submitted':
            frm.set_value('probability',50)
            break
        case 'Negotiating':
            frm.set_value('probability',75)
            break
        case 'Pending PO':
            frm.set_value('probability',90)
            break
        case 'Won':
            frm.set_value('probability',100)
            break
        default:
            frm.set_value('probability',0)

    }
}



function check_sales_stage_submitted_presales(frm){

    //Submitted by Presales update to proposal delivered to sales
    // if (frm.doc.sales_stage1 === 'Submitted by Presales') {

    if (frm.doc.sales_stage1 === 'Proposal Delivered To Sales') {
        frm.toggle_reqd('custom_presales_partners', true);
    } else {
        frm.toggle_reqd('custom_presales_partners', false);
    }
}




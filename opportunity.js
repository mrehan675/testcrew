const p_type = ['RFQ','Paid RFP','RFP']
const source = ["Eitmad"]
frappe.ui.form.on('Opportunity',{
    //Rehan
    refresh: function(frm) {
        var optional_stages = ['Scoping', 'Scoping Submitted', 'Proposing'];
        var current_stage = frm.doc.sales_stage1;
        
        
        if (optional_stages.includes(current_stage)) {
            frm.set_df_property("opportunity_amount", "reqd", false);
        } else {
            frm.set_df_property("opportunity_amount", "reqd", true);
        }
    },
    //
    sales_stage1:(frm)=>{
        //Rehan
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
    },
    refresh:(frm)=>{
        if (frm.is_new())
            frm.set_df_property('status','options',"Open\nClosed")
    }
   
})



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


// Saeed Omar: somar@testcrew.com
// Magda Mamoun: mmaamoun@testcrew.com
// Ahmed Almansari: aalmansari@testcrew.com
// Mohamed Abdulsalam: mabdulsalam@testcrew.com
// Mohamed Abdullah: mabdallah@testcrew.com
// Mohamed Sofy: msofy@testcrew.com
// Omar Hatem: omohamed@testcrew.com
// Khaled Saleh: ktaha@testcrew.com


// Saeed Omar
// Magda Mamoun
// Ahmed Almansari
// Mohamed Abdulsalam
// Mohamed Abdullah
// Mohamed Sofy
// Omar Hatem
// Khaled Saleh

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






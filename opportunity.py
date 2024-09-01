import frappe
from erpnext.crm.utils import (
	copy_comments,
	link_communications,
	link_open_events,
	link_open_tasks,
)
from frappe import _
from testcrew.utils.share import share_doc

from frappe.utils.background_jobs import enqueue
from frappe import msgprint, _

def after_insert(self):
	user = self.secondary_owner_opportunity
	#share doc with sales_manager
	if self.opportunity_owner:
		share_doc_with_manager(self)
	if self.opportunity_from == "Lead":
		frappe.get_doc("Lead", self.party_name).set_status(update=True)

		link_open_tasks(self.opportunity_from, self.party_name, self)
		link_open_events(self.opportunity_from, self.party_name, self)
		if frappe.db.get_single_value("CRM Settings", "carry_forward_communication_and_comments"):
			copy_comments(self.opportunity_from, self.party_name, self)
			link_communications(self.opportunity_from, self.party_name, self)
	#share doc with secondary_owner if he/she does not having access
	if user is None:
		return
	if not frappe.has_permission(doc=self,ptype='read',user=user):
		frappe.share.add_docshare(
			self.doctype, self.name, user, read=1, flags={"ignore_share_permission": True}
		)
		frappe.msgprint(
			_("Shared with the user {0} with {1} access").format(user, frappe.bold("read"), alert=True)
		)

def share_doc_with_manager(self):
	manager = frappe.db.get_value('Sales Person',self.opportunity_owner,'custom_sales_manager')
	if manager and  not frappe.has_permission(doc=self,ptype='read',user=manager):
		frappe.share.add_docshare(
			self.doctype, self.name, manager, read=1, flags={"ignore_share_permission": True}
		)




@frappe.whitelist()
def send_email_to_presale_assignee(doctype, doc_name,assignee_email):

	doc = frappe.get_doc(doctype, doc_name)


	receiver = assignee_email
	cc = ["salesops@testcrew.com"]

	if receiver:
		# Prepare the email arguments
		email_args = {
			"recipients": [receiver],  
			"cc": cc, 
			"message": _("New Pre-sales Assignment.Please see the attached document."),  
			"subject": _("Pre-Sale Assignment"), 
			"reference_doctype": doc.doctype,  
			"reference_name": doc.name,  
		}

		# Enqueue the email sending task without 'async'
		frappe.enqueue(
			method=frappe.sendmail,
			queue='short',
			timeout=300,
			**email_args
		)
		frappe.msgprint("Email Sent Successfully")
	else:
		frappe.msgprint(_("{0}: Employee email not found; hence, email not sent.").format(self.employee))
/* ============================================================
   Pebblio family linking system
   Handles a parent requesting to link to a child's account. The
   parent must know the child's email + password to prove they're
   legitimate, but the link only becomes active once the CHILD
   approves it from their own inbox — the parent can't just declare
   themselves a parent unilaterally.
   ============================================================ */

const FAMILY_LINKS_KEY = 'pebblio_family_links';
const MAX_CHILDREN_FREE = 3; // paid tier removes this cap later

function getFamilyLinks(){
  return readList(FAMILY_LINKS_KEY);
}
function saveFamilyLinks(links){
  writeList(FAMILY_LINKS_KEY, links);
}

function getApprovedChildren(parentUserId){
  return getFamilyLinks()
    .filter(l => l.parentUserId === parentUserId && l.status === 'approved')
    .map(l => getUsers().find(u => u.userId === l.childUserId))
    .filter(Boolean);
}

function getPendingLinksForParent(parentUserId){
  return getFamilyLinks().filter(l => l.parentUserId === parentUserId && l.status === 'pending');
}

function getPendingLinkForChild(childUserId){
  return getFamilyLinks().find(l => l.childUserId === childUserId && l.status === 'pending') || null;
}

/* Parent submits the child's email + password as proof, then this
   creates a pending request and notifies the child. Returns
   { ok, error } — never links immediately, since the child still
   has to say yes. */
async function requestChildLink(parentUser, childEmail, childPassword){
  const activeCount = getApprovedChildren(parentUser.userId).length + getPendingLinksForParent(parentUser.userId).length;
  if(activeCount >= MAX_CHILDREN_FREE){
    return { ok:false, error:`You can link up to ${MAX_CHILDREN_FREE} children on the free plan. Removing a child or upgrading unlocks more.` };
  }

  const child = getUsers().find(u => u.email.trim().toLowerCase() === childEmail.trim().toLowerCase());
  if(!child || child.role !== 'student'){
    return { ok:false, error:"No student account found with that email." };
  }

  const hash = await sha256Hex(childPassword);
  if(hash !== child.passwordHash){
    return { ok:false, error:"That email or password doesn't match a student account." };
  }

  if(getFamilyLinks().some(l => l.parentUserId === parentUser.userId && l.childUserId === child.userId && l.status !== 'declined')){
    return { ok:false, error:"You've already sent a request to this child, or you're already linked." };
  }

  const links = getFamilyLinks();
  const link = {
    linkId: uid('link'),
    parentUserId: parentUser.userId,
    childUserId: child.userId,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    respondedAt: null
  };
  links.push(link);
  saveFamilyLinks(links);

  const parentName = parentUser.firstName ? `${parentUser.firstName} ${parentUser.lastName}`.trim() : parentUser.username;
  sendMessage({
    fromUserId: parentUser.userId,
    toUserId: child.userId,
    subject: 'Parent link request',
    body: `${parentName} (${parentUser.email}) says they're your parent and wants to see your progress on Pebblio. Only approve this if you recognize them.`,
    type: 'parent_request',
    linkId: link.linkId
  });

  return { ok:true };
}

function respondToLink(linkId, approve){
  const links = getFamilyLinks();
  const link = links.find(l => l.linkId === linkId);
  if(!link) return;
  link.status = approve ? 'approved' : 'declined';
  link.respondedAt = new Date().toISOString();
  saveFamilyLinks(links);
}

// Reparent existing buttons: listeners, pressed state and saved values are preserved.
(()=>{
 const refill=byId('refillToggle'),immune=byId('immuneToggle'),menu=byId('battleMenuOpen'),help=byId('operationHelpOpen'),hint=byId('hint');
 const settings=document.querySelector('.settings-drawer'),toggles=document.createElement('div');toggles.className='battle-setting-toggles';
 refill.before(menu);toggles.append(refill,immune);settings.querySelector('summary').after(toggles);
 const stack=hint.parentElement;stack.before(hint);byId('rescue').after(help);stack.remove();
})();

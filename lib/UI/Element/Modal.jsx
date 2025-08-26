export default function Modal(props) {
    return <div class="modal fade p-5" tabindex="-1" role="dialog" id={props.id} >
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header bg-light">
                    <h4 class="modal-title">{'title' in props ? props.title : ''}</h4>
                    <button type="button" class="bootbox-close-button close" data-bs-dismiss="modal" data-dismiss="modal" aria-label="Close"><span
                        aria-hidden="true">&times;</span></button>
                </div>
                <div class="modal-body bg-light" style="text-align: left !important;">
                    <div class="row">
                        <div class="col-12 mx-auto px-0" >
                            <div class="row mx-0 px-0">
                                <div class="col-12">
                                    {props?.children}
                                </div>
                            </div>

                            <hr />
                            <center>
                                <div class="btn-group" role="group" aria-label="Button Holders">
                                    <button type="button" class="btn btn-raised btn-danger btn-rounded mx-1 px-4" data-dismiss="modal" data-bs-dismiss="modal">Cancel</button>
                                    <button type="submit" class={'doneButtonClass' in props ? props.doneButtonClass : "btn btn-raised btn-primary btn-rounded  mx-1  px-4"} onclick={'ondone' in props ? props.ondone : ''} data-dismiss={'okDismiss' in props ? (props.okDismiss ? 'modal' : 'false') : 'modal'} data-bs-dismiss={'okDismiss' in props ? (props.okDismiss ? 'modal' : 'false') : 'modal'}>{'doneButtonName' in props ? props.doneButtonName : 'Done'}</button>
                                </div>
                            </center>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>;
}
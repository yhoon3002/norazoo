import { SubakGamePresenterProps } from "../types/SubakGameTypes";

export default function SubakGamePresenter(props: SubakGamePresenterProps) {
    return (
        <>
            <div ref={props.matterRef} className="w-full h-full">
                <div
                    ref={props.joystickRef}
                    className="absolute inset-0 w-full h-full z-10"
                    style={{ touchAction: "none" }}
                ></div>
            </div>
        </>
    );
}

import { SubakGamePresenterProps } from "@/app/type/subakgame/SubakGameType";

export default function SubakGamePresenter(props: SubakGamePresenterProps) {
    return (
        <>
            <div ref={props.matterRef} className="w-full h-full"></div>
        </>
    );
}

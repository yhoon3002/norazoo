import Card from "@/app/common/Card";
import { HomePresenterProps } from "@/app/type/home/HomeType";

export default function HomePresenter(props: HomePresenterProps) {
    return (
        <>
            <h2 className="flex justify-center text-4xl">Title</h2>

            <div className="flex justify-center">
                <div className="grid grid-cols-4 gap-16 overflow-hidden">
                    {props.gameKind.map((game) => (
                        <div key={game.name}>
                            <Card
                                game={game}
                                handleOpenModal={props.handleOpenModal}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

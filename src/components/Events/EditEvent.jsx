import {
  Link,
  redirect,
  useNavigate,
  useNavigation,
  useSubmit,
} from "react-router-dom";

import Modal from "../UI/Modal.jsx";
import EventForm from "./EventForm.jsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchEvent, queryClient, updateEvent } from "../../utils/http.js";
import { useParams } from "react-router-dom";
import LoadingIndicator from "../UI/LoadingIndicator";
import ErrorBlock from "../UI/ErrorBlock";

export default function EditEvent() {
  const navigate = useNavigate();
  const { state } = useNavigation();
  const { id } = useParams();
  const submit = useSubmit();

  const {
    mutate,
    isPending: isPendingEdit,
    isError: isErrorEdit,
    error: editError,
  } = useMutation({
    mutationFn: updateEvent,
    onMutate: async ({ id, event }) => {
      await queryClient.cancelQueries({ queryKey: ["events", id] });

      const previousEvent = queryClient.getQueryData(["events", id]);
      queryClient.setQueryData(["events", id], event);

      return {
        previousEvent,
      };
    },
    onError: (error, data, context) => {
      queryClient.setQueryData(["events", id], context.previousEvent);
    },
    onSettled: () => {
      queryClient.invalidateQueries(["events", id]);
    },
  });

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["events", id],
    queryFn: ({ signal }) => fetchEvent({ id, signal }),
    staleTime: 10000,
  });

  function handleSubmit(formData) {
    // console.log(formData);
    // mutate({ id, event: formData });
    // navigate("../");
    submit(formData, { method: "PUT" });
  }

  function handleClose() {
    navigate("../");
  }

  let content;

  // if (isPending) {
  //   content = (
  //     <div className='center'>
  //       <LoadingIndicator />;
  //     </div>
  //   );
  // }

  if (isError) {
    content = (
      <>
        <ErrorBlock
          title='An error occurred'
          message={
            error?.info?.message ||
            "Failed to load event, please try again later."
          }
        />
        <div className='form-actions'>
          <Link to='../' className='button'>
            Okay
          </Link>
        </div>
      </>
    );
  }

  if (data) {
    content = (
      <EventForm inputData={data} onSubmit={handleSubmit}>
        {state === "submitting" ? (
          <p>Sending data...</p>
        ) : (
          <>
            <Link to='../' className='button-text' disabled={isPendingEdit}>
              Cancel
            </Link>
            <button type='submit' className='button' disabled={isPendingEdit}>
              {isPendingEdit ? "Updating..." : "Update"}
            </button>
          </>
        )}
      </EventForm>
    );
  }

  return <Modal onClose={handleClose}>{content}</Modal>;
}

export const editEventLoader = ({ params }) => {
  const { id } = params;
  return queryClient.fetchQuery({
    queryKey: ["events", id],
    queryFn: ({ signal }) => fetchEvent({ id, signal }),
  });
};

export const editEventAction = async ({ request, params }) => {
  const formData = await request.formData();
  const updatedEventData = Object.fromEntries(formData);
  const { id } = params;
  await updateEvent({ id, event: updatedEventData });
  await queryClient.invalidateQueries(["events"]);
  return redirect("../");
};

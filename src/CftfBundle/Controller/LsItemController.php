<?php

namespace CftfBundle\Controller;

use CftfBundle\Entity\LsAssociation;
use CftfBundle\Entity\LsDoc;
use CftfBundle\Entity\LsItem;
use CftfBundle\Form\Command\ChangeLsItemParentCommand;
use CftfBundle\Form\Command\CopyToLsDocCommand;
use CftfBundle\Form\LsDocListType;
use CftfBundle\Form\LsItemParentType;
use CftfBundle\Form\LsItemType;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Method;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * LsItem controller.
 *
 * @Route("/lsitem")
 */
class LsItemController extends Controller
{
    /**
     * Lists all LsItem entities.
     *
     * @Route("/", name="lsitem_index")
     * @Method("GET")
     * @Template()
     */
    public function indexAction()
    {
        $em = $this->getDoctrine()->getManager();

        $lsItems = $em->getRepository('CftfBundle:LsItem')->findAll();

        return [
            'lsItems' => $lsItems,
        ];
    }

    /**
     * Creates a new LsItem entity.
     *
     * @Route("/new/{doc}/{parent}", name="lsitem_new")
     * @Method({"GET", "POST"})
     * @Template()
     */
    public function newAction(Request $request, LsDoc $doc = null, LsItem $parent = null)
    {
        $ajax = false;
        if ($request->isXmlHttpRequest()) {
            $ajax = true;
        }

        $lsItem = new LsItem();

        if ($doc) {
            $lsItem->setLsDoc($doc);
            $lsItem->setLsDocUri($doc->getUri());

            if ($parent) {
                $parent->addChild($lsItem);
            } else {
                $doc->addTopLsItem($lsItem);
            }
        }

        $form = $this->createForm(LsItemType::class, $lsItem, ['ajax' => $ajax]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $lsItem->setUpdatedAt(new \DateTime()); // Timestampable does not follow up the chain
            $em = $this->getDoctrine()->getManager();
            $em->persist($lsItem);
            $em->flush();

            if ($ajax) {
                return new Response($this->generateUrl('editor_lsitem', ['id' => $lsItem->getId()]), Response::HTTP_CREATED);
            }

            return $this->redirectToRoute('lsitem_show', array('id' => $lsItem->getId()));
        }

        $ret = [
            'lsItem' => $lsItem,
            'form' => $form->createView(),
        ];

        if ($ajax && $form->isSubmitted() && !$form->isValid()) {
            return $this->render('CftfBundle:LsItem:new.html.twig', $ret, new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        return $ret;
    }

    /**
     * Finds and displays a LsItem entity.
     *
     * @Route("/{id}.{_format}", defaults={"_format"="html"}, name="lsitem_show")
     * @Method("GET")
     * @Template()
     */
    public function showAction(LsItem $lsItem, $_format = 'html')
    {
        if ('json' === $_format) {
            // Redirect?  Change Action for Template?
            return [ 'lsItem' => $lsItem ];
        }

        $deleteForm = $this->createDeleteForm($lsItem);

        return [
            'lsItem' => $lsItem,
            'delete_form' => $deleteForm->createView(),
        ];
    }

    /**
     * Displays a form to edit an existing LsItem entity.
     *
     * @Route("/{id}/edit", name="lsitem_edit")
     * @Method({"GET", "POST"})
     * @Template()
     */
    public function editAction(Request $request, LsItem $lsItem)
    {
        $ajax = false;
        if ($request->isXmlHttpRequest()) {
            $ajax = true;
        }

        $deleteForm = $this->createDeleteForm($lsItem);
        $editForm = $this->createForm(LsItemType::class, $lsItem, ['ajax' => $ajax]);
        $editForm->handleRequest($request);

        if ($editForm->isSubmitted() && $editForm->isValid()) {
            $lsItem->setUpdatedAt(new \DateTime()); // Timestampable does not follow up the chain
            $em = $this->getDoctrine()->getManager();
            $em->persist($lsItem);
            $em->flush();

            if ($ajax) {
                return new Response($this->generateUrl('editor_lsitem', ['id' => $lsItem->getId()]), Response::HTTP_ACCEPTED);
            }

            return $this->redirectToRoute('lsitem_edit', ['id' => $lsItem->getId()]);
        }

        $ret = [
            'lsItem' => $lsItem,
            'edit_form' => $editForm->createView(),
            'delete_form' => $deleteForm->createView(),
        ];

        if ($ajax && $editForm->isSubmitted() && !$editForm->isValid()) {
            return $this->render('CftfBundle:LsItem:edit.html.twig', $ret, new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        return $ret;
    }

    /**
     * Deletes a LsItem entity.
     *
     * @Route("/{id}", name="lsitem_delete")
     * @Method("DELETE")
     */
    public function deleteAction(Request $request, LsItem $lsItem)
    {
        $form = $this->createDeleteForm($lsItem);
        $form->handleRequest($request);

        $hasChildren = $lsItem->getChildren();

        if ($form->isSubmitted() && $form->isValid() && $hasChildren->isEmpty()) {
            $em = $this->getDoctrine()->getManager();
            $em->getRepository(LsAssociation::class)->removeAllAssociations($lsItem);
            $em->remove($lsItem);
            $em->flush();
        }

        return $this->redirectToRoute('lsitem_index');
    }

    /**
     * Creates a form to delete a LsItem entity.
     *
     * @param LsItem $lsItem The LsItem entity
     *
     * @return \Symfony\Component\Form\Form The form
     */
    private function createDeleteForm(LsItem $lsItem)
    {
        return $this->createFormBuilder()
            ->setAction($this->generateUrl('lsitem_delete', array('id' => $lsItem->getId())))
            ->setMethod('DELETE')
            ->getForm()
        ;
    }

    /**
     * Export an LSItem entity.
     *
     * @Route("/{id}/export", defaults={"_format"="json"}, name="lsitem_export")
     * @Method("GET")
     * @Template()
     */
    public function exportAction(LsItem $lsItem)
    {
        return [
            'lsItem' => $lsItem,
        ];
    }

    /**
     * Remove a child LSItem
     *
     * @Route("/{id}/removeChild/{child}", name="lsitem_remove_child")
     * @Method("POST")
     * @Template()
     *
     * @param \CftfBundle\Entity\LsItem $parent
     * @param \CftfBundle\Entity\LsItem $child
     * @return array
     */
    public function removeChildAction(LsItem $parent, LsItem $child)
    {
        $em = $this->getDoctrine()->getManager();
        $lsItemRepo = $em->getRepository(LsItem::class);
        $lsItemRepo->removeChild($parent, $child);
        $em->flush();

        return [];
    }

    /**
     * Copy an LsItem to a new LsDoc
     *
     * @Route("/{id}/copy", name="lsitem_copy_item")
     * @Method({"GET", "POST"})
     * @Template()
     *
     * @param \CftfBundle\Entity\LsItem $lsItem
     * @return array|Response
     */
    public function copyAction(Request $request, LsItem $lsItem)
    {
        // Steps
        //  - Select LsDoc to copy to
        //  - Clone LsItem to selected LsDoc
        $ajax = false;
        if ($request->isXmlHttpRequest()) {
            $ajax = true;
        }

        $command = new CopyToLsDocCommand();
        $form = $this->createForm(LsDocListType::class, $command->convertToDTO($lsItem), ['ajax' => $ajax]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em = $this->getDoctrine()->getManager();
            $newItem = $command->perform($form->getData(), $em);
            $em->flush();

            if ($ajax) {
                return new Response(
                    $this->generateUrl('editor_lsitem', ['id' => $newItem->getId()]),
                    Response::HTTP_CREATED,
                    [
                        'Location' => $this->generateUrl('editor_lsitem', ['id' => $newItem->getId()], UrlGeneratorInterface::ABSOLUTE_URL),
                    ]
                );
            }

            return $this->redirectToRoute('lsitem_show', array('id' => $lsItem->getId()));
        }

        $ret = [
            'form' => $form->createView(),
        ];

        if ($ajax && $form->isSubmitted() && !$form->isValid()) {
            return $this->render('CftfBundle:LsItem:copy.html.twig', $ret, new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        return $ret;
    }

    /**
     * Displays a form to change the parent of an existing LsItem entity.
     *
     * @Route("/{id}/parent", name="lsitem_change_parent")
     * @Method({"GET", "POST"})
     * @Template()
     */
    public function changeParentAction(Request $request, LsItem $lsItem)
    {
        $ajax = false;
        if ($request->isXmlHttpRequest()) {
            $ajax = true;
        }

        $lsDoc = $lsItem->getLsDoc();

        $command = new ChangeLsItemParentCommand();
        $form = $this->createForm(LsItemParentType::class, $command->convertToDTO($lsItem), ['ajax' => $ajax, 'lsDoc' => $lsDoc]);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em = $this->getDoctrine()->getManager();
            $command->perform($form->getData(), $em);
            $em->flush();

            if ($ajax) {
                return new Response($this->generateUrl('editor_lsitem', ['id' => $lsItem->getId()]), Response::HTTP_ACCEPTED);
            }

            return $this->redirectToRoute('lsitem_edit', ['id' => $lsItem->getId()]);
        }

        $ret = [
            'lsItem' => $lsItem,
            'lsDoc' => $lsDoc,
            'form' => $form->createView(),
        ];

        if ($ajax && $form->isSubmitted() && !$form->isValid()) {
            return $this->render('CftfBundle:LsItem:changeParent.html.twig', $ret, new Response('', Response::HTTP_UNPROCESSABLE_ENTITY));
        }

        return $ret;
    }
}
